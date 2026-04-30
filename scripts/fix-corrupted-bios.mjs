/**
 * fix-corrupted-bios.mjs
 * ========================
 * Replaces corrupted faculty bio values (publication lists / nav chrome)
 * with correct biographical text, or null where none is available.
 *
 * Usage:
 *   node scripts/fix-corrupted-bios.mjs
 *
 * Reads VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY from .env
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))

function loadEnv() {
  const envPath = join(__dirname, '..', '.env')
  try {
    const raw = readFileSync(envPath, 'utf-8')
    for (const line of raw.split('\n')) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#')) continue
      const eqIdx = trimmed.indexOf('=')
      if (eqIdx === -1) continue
      const key = trimmed.slice(0, eqIdx).trim()
      const val = trimmed.slice(eqIdx + 1).trim().replace(/^['"]|['"]$/g, '')
      if (!process.env[key]) process.env[key] = val
    }
  } catch {
    console.error('Could not read .env — make sure it exists at the project root.')
    process.exit(1)
  }
}

loadEnv()

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

// ── Corrected bios keyed by hbs_fac_id ───────────────────────────────────────
// null = no biographical text available; removes the corrupted value
const BIO_FIXES = {
  '108987': `Jeffrey J. Bussgang is a Senior Lecturer in the Entrepreneurial Management Unit at the Harvard Business School as well as Co-Founder and General Partner at Flybridge Capital Partners, an early-stage venture capital firm with offices in Boston and New York City and over $1 billion under management across seven seed funds and ten network funds. "Unicorn" portfolio companies include BitSight, FalconX, Habi, MadeiraMadeira, MongoDB, Nasuni, OpenFX, and Tomorrow.io. He studies lean startups as well as strategy and management challenges for founders.

Jeff's investment interests and entrepreneurial experience are in AI, vertical SaaS, and fintech start-ups. On behalf of Flybridge, he has led investments in dozens of companies, including bloXroute, Blitzy, BrightHire, Codecademy, FalconX, Finkargo, Habi, MadeiraMadeira, Noetica, Open English, OpenFX, Topline Pro, and Zest AI. Jeff is the cofounder of The Graduate Syndicate, a pre-seed fund that invests in recent Harvard graduates.

Jeff designed and leads the popular second year MBA course Launching Technology Ventures which prepares students to become startup founders and joiners. The course has been taught to over 2,500 students in over 30 sections in its 15 years. Jeff also teaches an application-based second year field course, Venture Capital Journey, for students who aspire to build a career in venture capital. He has written more than 80 case studies, teaching notes, and chapters on startups, entrepreneurship, and venture capital.

Jeff has authored three books: one for AI-forward founders, The Experimentation Machine, one for startup joiners, Entering StartUpLand, and one on venture capital and entrepreneurship, Mastering the VC Game, to provide entrepreneurs an insider's guide to financing and company-building. His books have been hailed by the Wall Street Journal, BusinessWeek, TechCrunch and The Financial Times as essential guides for entrepreneurs.

Jeff is an active community member, serving as board member at educational non-profit Facing History and Ourselves and co-founder and board chair of LEADS, an economic and leadership development program for diverse Gateway City leaders.

Prior to co-founding Flybridge, Jeff co-founded and served as President, Chief Operating Officer, and Board Director at Upromise, a loyalty marketing and financial services firm that was acquired by Sallie Mae. He also served as Vice President of Worldwide Marketing and Business Development, Vice President of Worldwide Professional Services and head of Product Management at Open Market, an Internet commerce software leader that went public in 1996. Prior to Open Market, Jeff was with the strategy consulting firm, The Boston Consulting Group.

Jeff holds a BA in Computer Science from Harvard University where he graduated magna cum laude and an MBA from Harvard Business School where he was a Baker Scholar and a Ford Scholar.`, // Jeffrey J. Bussgang
  '6479':   `Linda A. Hill is the Wallace Brett Donham Professor of Business Administration at the Harvard Business School and Faculty Chair of the Leadership Initiative. Hill is regarded as one of the top experts on leadership and innovation. Hill is the co-author of Collective Genius: The Art and Practice of Leading Innovation (Harvard Business Review Press 2014), co-founder of Paradox Strategies, and co-creator of the Innovation Quotient, re:Route, and re:Mind. Hill co-founded InnovationForce, a SaaS company using AI and machine learning to accelerate the process of innovation. It was named by Fast Company as a 2023 and 2024 "Innovative Company to Watch." She was named by Thinkers50 as one of the top ten management thinkers in the world in 2013, 2021, and 2025 and received the Thinkers50 Innovation Award in 2015. She is also the recipient of the 1999 Greenhill Award and the 2017 Greenhill Service Award, which recognize extraordinary contributions to the Harvard Business School community. Hill's Collective Genius has also been named to the inaugural Thinkers50 Booklist: 10 Management Classics for 2022. Hill is a coauthor of the book Genius at Scale: How Great Leaders Drive Innovation, which introduces the 3 roles of leading innovation at scale across organizations and ecosystems: architect, bridger, and catalyst. The forthcoming book has already been recognized on the global stage, having been shortlisted for the 2025 Thinkers50 Innovation Award. She was named one of six Innovation Luminaries at the FEI25 Awards (2025) by All Things Innovation, which celebrates trailblazers advancing the practice and understanding of innovation worldwide.

Hill's research focuses on leadership development, building agile, innovative organizations, and implementing global strategies. Her current research focuses on scaling innovation and digital leadership. She is the author of highly regarded books and articles on leadership. Collective Genius was named by Business Insider as one of "The 20 Best Business Books" and received the Gold Medal for the Leadership Axiom Business Book Award. Hill's TED talk on how to manage for collective creativity has more than 2.9 million views. In 2015, Hill, along with her co-authors, received the first Warren Bennis Prize for the Harvard Business Review article "Collective Genius," based on the book. Hill is also the co-author of Being the Boss: The 3 Imperatives of Becoming a Great Leader and author of Becoming a Manager: How New Managers Master the Challenges of Leadership. In 2022, the article "Becoming the Boss," which is based on the book Becoming a Manager, was selected as one of the most influential and innovative articles from HBR's first century. Her books and articles have been translated into multiple languages. Hill has authored or co-authored numerous articles: including "Winning the Race for Talent in Emerging Markets;" "Are You a High Potential?" "The Board's New Innovation Imperative;" "Drive Innovation with Better Decision-Making;" "What Makes a Great Leader?" "Being the Agile Boss;" "Incorporating the Arts to Create Technical Leaders in the Future;" and "Where Can Digital Transformation Take You?"

Hill has chaired numerous HBS Executive Education programs, including the Young Presidents' Organization Presidents' Seminar, the High Potentials Leadership Program, Leading in the Digital Era, Advancing Women of Color in Leadership and Leading and Building a Culture of Innovation. She was course-head during the development of the Leadership and Organizational Behavior MBA required course.`, // Linda A. Hill
  '240491': null, // Karim R. Lakhani      — awaiting correct bio
  '13527':  null, // Andrei Shleifer       — awaiting correct bio
  '1504981': `John is a senior lecturer in the Strategy unit at Harvard Business School, an affiliate of HBS' Business and Environment Initiative, and a Faculty Associate of the Salata Institute for Climate and Sustainability. He teaches in the first year MBA Strategy course, and co-teaches the intensive course on Climate & Artificial Intelligence. He studies climate strategy, climate finance, and building climate technology ventures, and has co-taught a lab course on Risks, Opportunities and Investments in the Era of Climate Change.

John is an Operating Partner at Azolla Ventures, an early stage climate technology and deeptech venture fund, where he advises portfolio companies on scaling & commercializing novel technologies. Previously John has held a number of roles including Senior Advisor at The Boston Consulting Group, where he advised clients on topics in retail, technology, and climate. He also sits on several boards, including C-Motive (a novel electrostatic motor company), URBN (Urban Outfitters, Inc.) and Bombas. Before he joined the faculty at HBS, John was the Chief Technology Officer at Wayfair where he spent a decade on the executive team, building the company alongside the founders from $200m to $11b, an IPO. While there, he started and scaled teams in multiple functions during periods of hyper-growth, including leading multiple technical and product launches. He led the initial development of the strategy that Wayfair followed for a decade, led the development and scaling of the international business & supply chain, launched multiple sub-brands, and held key roles in merchandising, supply chain, and marketing. He was also the Head of Global Carbon Markets and Chief Integrated Product Officer at Indigo Ag, a leading regenerative agriculture climate-tech company which is the largest carbon farming program by acres enrolled worldwide and was the first to produce verified, registry-issued agricultural carbon credits at scale. Early in his career he was a consultant at the Boston Consulting Group, where he spent seven years working on topics in retail, consumer goods, and healthcare. At BCG he focused on innovation where he was a founding member of the Global Center on Consumer Research and a co-founder of the Multi-Channel Retail topic.

John is an active participant in climate and emissions policy, through his work on the Carbon Zero Project, a non-profit that catalyzes projects in efficient and effective emissions management tools and policies. The CZP helps foster resources for partner organizations to drive more rapid development of governmental tools & mechanisms to drive an effective, efficient and just climate transition. He is an early-stage angel investor in climate tech companies, and advises several on approaches to scaling, go-to-market, and de-risking technology and commercial strategies. He also helps boards develop effective approaches to ensuring the effectiveness of climate strategies and has written on key approaches and pitfalls to developing climate strategy.

John received an MBA with distinction from the London Business School in corporate finance, and a BA in mathematics from Reed College.`, // John C. Mulliken
  '180090': null, // Dwight Angelini       — awaiting correct bio
  '1621663': `Maren Hoff is an Assistant Professor in the Marketing Unit at Harvard Business School.

Professor Hoff studies how cultural change shapes consumer behavior and marketplace trends. Her research examines how and why tastes, styles, and products change in meaning over time as societal norms evolve. She combines large-scale data with experiments to trace long-term changes in how consumers express identity through the products they use.

Professor Hoff earned her Ph.D. in Marketing from Columbia Business School, an M.Litt. in Marketing from the University of St Andrews, and a B.Sc. in Business Administration from the University of Muenster.`, // Maren Hoff
  '1691653':null, // Georgia Perakis       — awaiting correct bio
  '1195264':null, // Fernanda B. Viegas    — awaiting correct bio
  '1357120':null, // Martin Wattenberg     — awaiting correct bio
  '1061854':null, // David Yang            — awaiting correct bio
  '340063': `Lauren Cohen is the L.E. Simmons Professor in the Finance & Entrepreneurial Management Units at Harvard Business School and a Research Associate at the National Bureau of Economic Research. He is an Editor of the Review of Financial Studies, along with being a past Editor of Management Science, and serving on the editorial board of the Review of Asset Pricing Studies.

Professor Cohen teaches in the MBA Program, Executive Education Program, Doctoral Program, and Special Custom Programs at the Harvard Business School, teaching across Family Enterprise, Investment Management, and Innovation Course Offerings. In particular, he is the Faculty Co-Chair and Designer of the HBS Executive Education course 'Building a Legacy: Family Office Wealth Management,' designer of a first-of-its-kind MBA Course in Family Offices entitled 'How to Not Bankrupt Your Family,' and Faculty Co-Chair and Designer of the HarvardX Fintech course.

He is an award-winning researcher, and best-selling case writer, with works published in the top journals in Finance and Economics. His work is frequently profiled in various media outlets including The Wall Street Journal, The New York Times, The Washington Post, The Economist, and Forbes. It has also been recognized by numerous National Science Foundation (NSF) Awards, including a National Science Foundation Early Career Development (CAREER) Award for his research agenda on Relationships in Finance. He was named a 2008 Pensions & Investments "Cutting Edge Academic," a Top 40 Under 40 Business School Professor in 2017 by Poets & Quants, and a top teacher at Harvard by CNBC.

Dr. Cohen frequently advises government organizations in the US and abroad, including the United States Securities and Exchange Commission, United States Patent & Trademark Office, testifying before the United States Congress, and advising governments, central banks, inter-governmental organizations, and sovereign ruling families throughout Europe, Africa, and Asia on matters of Innovation Policy, Impact Investing, Climate Change, Pension Structure, and Family Office Management.

Through his applied work, Dr. Cohen has consulted with top hedge funds in the industry, and has been awarded numerous practitioner research prizes. He has also appeared as an expert witness in high profile innovation-, insider trading-, and investment-related litigation cases, including those involving the largest global asset management and operating firms.

Dr. Cohen received a PhD in finance and an MBA from the University of Chicago in 2005. He earned dual undergraduate degrees from the University of Pennsylvania - a BSE from the Wharton School and a BA in economics from the College of Arts & Sciences in 2001. He has also served on the Advisory Boards of Oppenheimer Funds (acquired by Invesco Investment Management Ltd.), Cake Financial (acquired by E*Trade) and Quadriserv, Inc. (acquired by EquiLend Holdings - an industry consortium comprised of Goldman Sachs, Morgan Stanley, Credit Suisse, Bank of America, UBS, JPMorgan, Northern Trust, Blackrock and State Street).

Professor Cohen currently resides in Belmont, MA with his wife - Dr. Nicole Cohen - and their six children. In his spare time, Professor Cohen is a competitive powerlifter.`, // Lauren H. Cohen
  '77265':  `Ranjay Gulati is the Paul R. Lawrence MBA Class of 1942 Professor of Business Administration and the former Unit Head of the Organizational Behavior Unit at Harvard Business School. His pathbreaking research, which focuses on unlocking organizational and unleashing human potential, has shown how winning companies—­those that prosper both in good times and bad—drive growth and prosperity. His recent work explores leadership and strategic challenges for building high growth organizations in turbulent markets. Some of his prior work has focused on the enablers and implications of within-firm and inter-firm collaboration. He has looked at both when and how firms should leverage greater connectivity within and across their boundaries to enhance performance.

Professor Gulati is the recipient of the 2024 CK Prahalad Award for Scholarly Impact on Practice. The award "recognizes excellence in the application of theory and research in practice," honoring a scholar whose research generates learning from practice, who authors publications that substantively affect the practice of management, and who integrates research and practice. He was ranked as one of the top ten most cited scholars in Economics and Business over a decade by ISI-Incite. The Economist, Financial Times, and the Economist Intelligence Unit have listed him as among the top handful of business school scholars whose work is most relevant to management practice.

Professor Gulati is a prolific author, with his most recent book, How to Be Bold: The Surprising Science of Everyday Courage (Harper Business, 2025) being released in September 2025. Gulati offers a powerful playbook for becoming bolder and braver than we ever thought possible. Rather than leaving brave deeds to mythological heroes and resigning ourselves to apathy or cowardice, Gulati argues that we can train ourselves to step up and act in the face of uncertainty, and offers a science-backed playbook on how to do so. His previous book, Deep Purpose: The Heart and Soul of High Performance Companies (Harper Collins, 2022) offers a compelling reassessment and defense of purpose as a management ethos, documenting the vast performance gains and social benefits that become possible when firms get purpose right. It was picked to be among the best business books of 2022 by Forbes, Thinkers 50, the Next Big Idea Club, and Axiom business books. His previous managerial book, Reorganize for Resilience: Putting Customers at the Center of Your Organization (Harvard Business Press, 2009), which was a finalist for the George Terry Best Book in Management Award, Professor Gulati explores how "resilient" companies—those that prosper both in good times and bad—drive growth and increase profitability by immersing themselves in the lives of their customers.

Professor Gulati is the past-President of the Business Policy and Strategy Division at the Academy of Management and an elected fellow of the Strategic Management Society. He has been a Harvard MacArthur Fellow and a Sloan Foundation Fellow. His research has been published in leading journals such as Administrative Science Quarterly, Harvard Business Review, American Journal of Sociology, Strategic Management Journal, Sloan Management Review, Academy of Management Journal, and Organization Science. He has also written for the Wall Street Journal, Forbes, strategy+business, and the Financial Times.

Professor Gulati advises and speaks to corporations large and small around the globe. He is the former Chair of Harvard Business School's Advanced Management Program. He has received a number of awards for his teaching including the Best Professor Award for his teaching in the MBA and executive MBA programs at the Kellogg School where he was on the faculty prior to coming to Harvard.

He has been a frequent guest on CNBC as well as a panelist on several of their series on topics that include: the Business of Innovation, Collaboration, and Leadership Vision. Professor Gulati holds a Ph.D. from Harvard University, a Master's Degree in Management from M.I.T.'s Sloan School of Management, and two Bachelor's Degrees, in Computer Science and Economics, from Washington State University and St. Stephens College, New Delhi, respectively. He lives in Newton, Massachusetts.`, // Ranjay Gulati
}

// ── Resolve hbs_fac_id → internal UUID ───────────────────────────────────────
const { data: rows, error: fetchErr } = await supabase
  .from('faculty')
  .select('id, hbs_fac_id, name')
  .in('hbs_fac_id', Object.keys(BIO_FIXES))

if (fetchErr) {
  console.error('Failed to fetch faculty rows:', fetchErr.message)
  process.exit(1)
}

const idMap = Object.fromEntries(rows.map(r => [r.hbs_fac_id, { id: r.id, name: r.name }]))

// ── Apply updates ─────────────────────────────────────────────────────────────
let updated = 0
let skipped = 0

for (const [hbsId, bio] of Object.entries(BIO_FIXES)) {
  const faculty = idMap[hbsId]
  if (!faculty) {
    console.warn(`  SKIP  hbs_fac_id=${hbsId} — not found in DB`)
    skipped++
    continue
  }

  const { error } = await supabase
    .from('faculty')
    .update({ bio: bio ?? null })
    .eq('id', faculty.id)

  if (error) {
    console.error(`  ERROR ${faculty.name} (${hbsId}): ${error.message}`)
  } else {
    const preview = bio ? bio.slice(0, 60) + '…' : 'null'
    console.log(`  OK    ${faculty.name} (${hbsId}) → ${preview}`)
    updated++
  }
}

console.log(`\nDone: ${updated} updated, ${skipped} skipped.`)
