import Footer from './Footer'

/**
 * Authenticated page layout wrapper.
 * Appends the feedback-enabled copyright footer after each post-login page.
 * NavBar is handled inside each page component.
 */
export default function Layout({ children }) {
  return (
    <>
      {children}
      <Footer showFeedback={true} />
    </>
  )
}
