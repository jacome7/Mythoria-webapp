import './globals.css';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout = ({ children }: LayoutProps) => {
  return (
    <html lang="en" data-theme="autumn">
      <body>
        {children}
      </body>
    </html>
  );
};

export default Layout;