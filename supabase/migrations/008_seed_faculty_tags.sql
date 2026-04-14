-- Curated research tags for the 20 pilot faculty
-- Inserted via faculty_id looked up from hbs_fac_id.
-- Tags reflect each professor's primary research areas.

insert into faculty_tags (faculty_id, tag, source)
select f.id, v.tag, 'manual'
from faculty f
join (values
  -- Jung Koo Kang (A&M)
  ('1324810', 'Financial Accounting'),
  ('1324810', 'Banking'),
  ('1324810', 'Fintech'),
  ('1324810', 'Digital Lending'),
  ('1324810', 'Information Economics'),

  -- Jonas Heese (A&M)
  ('740159', 'Accounting'),
  ('740159', 'Corporate Governance'),
  ('740159', 'Financial Reporting'),
  ('740159', 'Regulatory Compliance'),
  ('740159', 'Auditing'),

  -- Jesse M. Shapiro (BGIE)
  ('1356397', 'Political Economy'),
  ('1356397', 'Media & Democracy'),
  ('1356397', 'Polarization'),
  ('1356397', 'Public Economics'),
  ('1356397', 'Electoral Politics'),

  -- Caroline M. Elkins (BGIE)
  ('937841', 'British Empire'),
  ('937841', 'Colonialism'),
  ('937841', 'African History'),
  ('937841', 'Human Rights'),
  ('937841', 'Violence & Conflict'),

  -- Paul A. Gompers (Finance)
  ('6463', 'Private Equity'),
  ('6463', 'Venture Capital'),
  ('6463', 'Entrepreneurial Finance'),
  ('6463', 'Corporate Governance'),
  ('6463', 'Innovation'),

  -- Tom Nicholas (Entrepreneurial Management)
  ('337264', 'Venture Capital History'),
  ('337264', 'Innovation'),
  ('337264', 'Entrepreneurship'),
  ('337264', 'Economic History'),
  ('337264', 'Intellectual Property'),

  -- Malcolm Baker (Finance)
  ('10639', 'Behavioral Finance'),
  ('10639', 'Corporate Finance'),
  ('10639', 'Asset Pricing'),
  ('10639', 'Capital Markets'),
  ('10639', 'Investor Behavior'),

  -- John D. Macomber (Finance)
  ('92011', 'Real Estate'),
  ('92011', 'Infrastructure'),
  ('92011', 'Emerging Markets'),
  ('92011', 'Sustainability'),
  ('92011', 'Urban Development'),

  -- Anita Elberse (Marketing)
  ('244024', 'Entertainment Industry'),
  ('244024', 'Sports Business'),
  ('244024', 'Media Strategy'),
  ('244024', 'Blockbuster Strategy'),
  ('244024', 'Celebrity & Talent'),

  -- Sunil Gupta (Marketing)
  ('261323', 'Digital Marketing'),
  ('261323', 'Customer Management'),
  ('261323', 'Platform Strategy'),
  ('261323', 'Business Models'),
  ('261323', 'Data-Driven Marketing'),

  -- Alex Chan (Marketing)
  ('1495303', 'Consumer Behavior'),
  ('1495303', 'Marketing Strategy'),
  ('1495303', 'Behavioral Economics'),
  ('1495303', 'Decision Making'),

  -- Michael I. Norton (Marketing)
  ('326229', 'Behavioral Economics'),
  ('326229', 'Consumer Psychology'),
  ('326229', 'Happiness & Well-being'),
  ('326229', 'Fairness'),
  ('326229', 'Rituals & Behavior'),

  -- Linda A. Hill (OB)
  ('6479', 'Leadership Development'),
  ('6479', 'Management'),
  ('6479', 'Organizational Change'),
  ('6479', 'Innovation Culture'),
  ('6479', 'Talent Management'),

  -- Boris Groysberg (OB)
  ('10650', 'Talent Management'),
  ('10650', 'Leadership'),
  ('10650', 'Human Capital'),
  ('10650', 'Executive Mobility'),
  ('10650', 'Organizational Behavior'),

  -- Ramon Casadesus-Masanell (Strategy)
  ('24279', 'Business Models'),
  ('24279', 'Competitive Strategy'),
  ('24279', 'Platform Competition'),
  ('24279', 'Open Source'),
  ('24279', 'Value Creation'),

  -- Andy Wu (Strategy)
  ('871877', 'Technology Strategy'),
  ('871877', 'Entrepreneurship'),
  ('871877', 'Platform Economics'),
  ('871877', 'Competitive Dynamics'),
  ('871877', 'Digital Strategy'),

  -- Marco Iansiti (TOM)
  ('6482', 'Digital Transformation'),
  ('6482', 'Artificial Intelligence'),
  ('6482', 'Technology Strategy'),
  ('6482', 'Operations'),
  ('6482', 'Ecosystem Strategy'),

  -- Amy C. Edmondson (OB)
  ('6451', 'Psychological Safety'),
  ('6451', 'Teaming'),
  ('6451', 'Organizational Learning'),
  ('6451', 'Leadership'),
  ('6451', 'Healthcare Management'),

  -- Karim R. Lakhani (TOM)
  ('240491', 'Open Innovation'),
  ('240491', 'Crowdsourcing'),
  ('240491', 'Artificial Intelligence'),
  ('240491', 'Digital Transformation'),
  ('240491', 'Platforms'),

  -- Feng Zhu (TOM)
  ('14938', 'Platform Strategy'),
  ('14938', 'Digital Markets'),
  ('14938', 'Technology Competition'),
  ('14938', 'Two-Sided Markets'),
  ('14938', 'Ecosystem Management')

) as v(hbs_fac_id, tag) on f.hbs_fac_id = v.hbs_fac_id
on conflict (faculty_id, tag) do nothing;
