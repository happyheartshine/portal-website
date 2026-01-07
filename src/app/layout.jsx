import PropTypes from 'prop-types';
import { Open_Sans } from 'next/font/google';

// CSS
import './globals.css';

// Providers
import Providers from './providers';

// Fonts
const fontOpenSans = Open_Sans({
  subsets: ['latin'],
  style: 'normal',
  weight: ['300', '400', '500', '600', '700']
});

export const metadata = {
  title: 'Internal Operations Portal',
  description: 'Internal Operations & Team Management Portal'
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={`${fontOpenSans.className} antialiased`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}

RootLayout.propTypes = { children: PropTypes.any };
