export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{margin:0, background:"#0a0a0a", color:"white", fontFamily:"system-ui,sans-serif"}}>
        {children}
      </body>
    </html>
  )
}
