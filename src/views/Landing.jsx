// next
import Image from 'next/image';
import Link from 'next/link';

// assets
const Logo = '/assets/images/logo-white.svg';
const DashboardImg = '/assets/images/landing/img-header-main.jpg';

// ==============================|| LANDING PAGE ||============================== //

function FeatureCard({ title, description, bullets }) {
  return (
    <div className="card bg-theme-cardbg dark:bg-themedark-cardbg p-6 transition-shadow hover:shadow-lg">
      <h3 className="mb-3 text-xl font-semibold text-theme-headings dark:text-themedark-headings">{title}</h3>
      <p className="mb-4 text-sm text-theme-bodycolor dark:text-themedark-bodycolor">{description}</p>
      {bullets && bullets.length > 0 && (
        <ul className="space-y-2">
          {bullets.map((bullet, idx) => (
            <li key={idx} className="flex items-start text-xs text-theme-secondarytextcolor dark:text-themedark-secondarytextcolor">
              <i className="ti ti-check mr-2 mt-0.5 text-primary-500"></i>
              <span>{bullet}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function Landing() {
  return (
    <>
      <header
        id="home"
        className="bg-theme-sidebarbg dark:bg-dark-500 relative flex flex-col items-center justify-center overflow-hidden pt-[100px] pb-0 sm:pt-[180px]"
      >
        <nav className="navbar group bg-theme-sidebarbg dark:bg-themedark-cardbg fixed top-0 z-50 w-full !bg-transparent shadow-[0_0_24px_rgba(27,46,94,.05)] backdrop-blur dark:shadow-[0_0_24px_rgba(27,46,94,.05)]">
          <div className="container">
            <div className="static flex items-center justify-between py-4 sm:relative">
              <div className="flex flex-1 items-center justify-center sm:items-stretch sm:justify-between">
                <div className="flex flex-shrink-0 items-center justify-between">
                  <Link href="#home">
                    <Image className="h-auto" src={Logo} alt="Employee Portal" width={130} height={0} />
                  </Link>
                </div>
                <div className="grow">
                  <div className="me-3 flex flex-row justify-end space-x-2 p-0">
                    <Link
                      href="/login"
                      className="hidden rounded-md px-3 py-2 text-base font-medium text-white/60 transition-all hover:text-white sm:inline-block"
                    >
                      Sign In
                    </Link>

                    <Link
                      href="/login"
                      type="button"
                      className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-200 p-1 text-gray-900 hover:bg-gray-900 hover:text-white focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-gray-800 focus:outline-none sm:hidden"
                    >
                      <i className="ti ti-user"></i>
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </nav>
        <div className="relative z-10 container">
          <div className="mx-auto w-full text-center md:w-10/12">
            <h1 className="mb-5 text-[22px] leading-[1.2] text-white md:text-[36px] lg:text-[48px]">
              Employee & Manager Portal
            </h1>
            <div>
              <div className="mx-auto sm:w-8/12">
                <p className="mb-0 text-[14px] text-white/80 sm:text-[16px]">
                  Streamline your daily operations with order submissions, refund management, coupon tracking, and comprehensive analytics—all in one unified platform.
                </p>
              </div>
            </div>
            <div className="my-5 sm:my-12">
              <Link
                href="/login"
                className="btn text-dark-500 mt-1 mr-2 rounded-full border border-white bg-white hover:opacity-70 focus:opacity-70 active:opacity-70"
              >
                Sign In
              </Link>
              <a
                href="#features"
                className="btn mt-1 rounded-full border border-white/30 bg-transparent text-white hover:bg-white/10 focus:bg-white/10 active:bg-white/10"
              >
                View Features
              </a>
            </div>
            <div className="mx-auto mb-8 grid max-w-4xl grid-cols-1 gap-4 text-left sm:grid-cols-2 lg:grid-cols-4">
              <div className="flex items-start space-x-3">
                <i className="ti ti-shopping-cart text-primary-400 mt-1 text-2xl"></i>
                <div>
                  <p className="mb-0 text-sm font-medium text-white">Order Submission</p>
                  <p className="mb-0 text-xs text-white/70">Daily orders with IST date tracking</p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <i className="ti ti-refund text-primary-400 mt-1 text-2xl"></i>
                <div>
                  <p className="mb-0 text-sm font-medium text-white">Refund Tracking</p>
                  <p className="mb-0 text-xs text-white/70">Status updates & archive workflow</p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <i className="ti ti-ticket text-primary-400 mt-1 text-2xl"></i>
                <div>
                  <p className="mb-0 text-sm font-medium text-white">Coupons & Credit</p>
                  <p className="mb-0 text-xs text-white/70">USD balance with 90-day validity</p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <i className="ti ti-shield-check text-primary-400 mt-1 text-2xl"></i>
                <div>
                  <p className="mb-0 text-sm font-medium text-white">Management Tools</p>
                  <p className="mb-0 text-xs text-white/70">Discipline, deductions & analytics</p>
                </div>
              </div>
            </div>
            <div className="mt-8 sm:mt-10">
              <div className="relative">
                <Image
                  src={DashboardImg}
                  alt="Portal Preview"
                  width={1200}
                  height={700}
                  className="w-full rounded-t-[14px] border-4 border-white shadow-[0px_-6px_10px_0px_rgba(12,21,70,0.03)]"
                  priority
                />
                <div className="absolute right-4 top-4 rounded-full bg-white/90 px-4 py-2 text-xs font-semibold text-theme-sidebarbg backdrop-blur-sm">
                  Employee + Manager Portal
                </div>
              </div>
            </div>
          </div>
        </div>
        <Image
          src="/assets/images/landing/img-wave.svg"
          alt="Wave"
          width={1440}
          height={100}
          className="absolute right-0 bottom-0 left-0 z-10 w-full object-contain drop-shadow-[0px_-6px_10px_rgba(12,21,70,0.05)] dark:brightness-[0.1]"
          priority
        />
        <div className="absolute inset-0 z-[1] bg-[linear-gradient(0deg,rgba(0,0,0,0.5019607843),transparent)]"></div>
      </header>

      {/* Features Section */}
      <section id="features" className="bg-theme-bodybg dark:bg-themedark-bodybg py-16 sm:py-24">
        <div className="container">
          <div className="mx-auto mb-12 text-center md:w-3/4">
            <h2 className="mb-4 text-3xl font-semibold text-theme-headings dark:text-themedark-headings sm:text-4xl">
              Powerful Features for Your Workflow
            </h2>
            <p className="text-theme-bodycolor dark:text-themedark-bodycolor">
              Everything you need to manage orders, refunds, credits, and team operations efficiently.
            </p>
          </div>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            <FeatureCard
              title="Daily Orders Submission"
              description="Submit and track your daily orders with automatic IST date handling. View order history and status updates in real-time."
              bullets={['IST timezone default', 'Order history tracking']}
            />
            <FeatureCard
              title="Refund Requests"
              description="Create refund requests with edit windows. Track status through Pending, Done, and Archived states with full audit trail."
              bullets={['Edit window support', 'Status workflow tracking']}
            />
            <FeatureCard
              title="Coupons & Credit"
              description="Manage your coupon balance in USD, clear full balance, and view complete transaction history with 90-day validity tracking."
              bullets={['USD currency', '90-day validity period']}
            />
            <FeatureCard
              title="Verify Orders"
              description="Managers can review and approve employee order submissions. Access comprehensive order analytics and team performance metrics."
              bullets={['Approval workflow', 'Team analytics']}
            />
            <FeatureCard
              title="Process Refunds"
              description="Handle full and partial refunds with complete tracking. Monitor refund status, amounts, and archive completed transactions."
              bullets={['Full & partial refunds', 'Status tracking']}
            />
            <FeatureCard
              title="Discipline & Deductions"
              description="Issue warnings to team members with automatic 30-day archiving. Manage INR deductions and maintain discipline records."
              bullets={['30-day auto-archive', 'INR deduction support']}
            />
          </div>
        </div>
      </section>

      {/* Role Split Section */}
      <section className="bg-theme-cardbg dark:bg-themedark-cardbg py-16 sm:py-20">
        <div className="container">
          <div className="mx-auto mb-12 text-center md:w-3/4">
            <h2 className="mb-4 text-3xl font-semibold text-theme-headings dark:text-themedark-headings sm:text-4xl">
              Built for Your Role
            </h2>
          </div>
          <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
            <div className="rounded-lg border border-theme-border dark:border-themedark-border bg-theme-bodybg dark:bg-themedark-bodybg p-8">
              <div className="mb-6 flex items-center space-x-3">
                <i className="ti ti-user text-primary-500 text-3xl"></i>
                <h3 className="text-2xl font-semibold text-theme-headings dark:text-themedark-headings">For Employees</h3>
              </div>
              <ul className="space-y-3">
                <li className="flex items-start text-theme-bodycolor dark:text-themedark-bodycolor">
                  <i className="ti ti-check mr-3 mt-1 text-primary-500"></i>
                  <span>Submit daily orders with IST date tracking</span>
                </li>
                <li className="flex items-start text-theme-bodycolor dark:text-themedark-bodycolor">
                  <i className="ti ti-check mr-3 mt-1 text-primary-500"></i>
                  <span>Request refunds with status visibility</span>
                </li>
                <li className="flex items-start text-theme-bodycolor dark:text-themedark-bodycolor">
                  <i className="ti ti-check mr-3 mt-1 text-primary-500"></i>
                  <span>Manage coupons and credit balance (USD)</span>
                </li>
                <li className="flex items-start text-theme-bodycolor dark:text-themedark-bodycolor">
                  <i className="ti ti-check mr-3 mt-1 text-primary-500"></i>
                  <span>View personal dashboard and analytics</span>
                </li>
              </ul>
            </div>
            <div className="rounded-lg border border-theme-border dark:border-themedark-border bg-theme-bodybg dark:bg-themedark-bodybg p-8">
              <div className="mb-6 flex items-center space-x-3">
                <i className="ti ti-users text-primary-500 text-3xl"></i>
                <h3 className="text-2xl font-semibold text-theme-headings dark:text-themedark-headings">For Managers</h3>
              </div>
              <ul className="space-y-3">
                <li className="flex items-start text-theme-bodycolor dark:text-themedark-bodycolor">
                  <i className="ti ti-check mr-3 mt-1 text-primary-500"></i>
                  <span>Verify and approve employee orders</span>
                </li>
                <li className="flex items-start text-theme-bodycolor dark:text-themedark-bodycolor">
                  <i className="ti ti-check mr-3 mt-1 text-primary-500"></i>
                  <span>Process full and partial refunds</span>
                </li>
                <li className="flex items-start text-theme-bodycolor dark:text-themedark-bodycolor">
                  <i className="ti ti-check mr-3 mt-1 text-primary-500"></i>
                  <span>Issue discipline warnings with deductions (INR)</span>
                </li>
                <li className="flex items-start text-theme-bodycolor dark:text-themedark-bodycolor">
                  <i className="ti ti-check mr-3 mt-1 text-primary-500"></i>
                  <span>Access comprehensive team analytics</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-theme-sidebarbg dark:bg-dark-500 border-t border-white/10 py-8">
        <div className="container">
          <div className="flex flex-col items-center justify-between space-y-4 sm:flex-row sm:space-y-0">
            <Link href="#home">
              <Image className="h-auto" src={Logo} alt="Employee Portal" width={100} height={0} />
            </Link>
            <div className="flex flex-wrap items-center justify-center space-x-6 text-sm text-white/70">
              <Link href="/login" className="hover:text-white transition-colors">
                Sign In
              </Link>
              <a href="#features" className="hover:text-white transition-colors">
                Features
              </a>
            </div>
            <p className="text-xs text-white/60">
              © {new Date().getFullYear()} Employee Portal. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </>
  );
}
