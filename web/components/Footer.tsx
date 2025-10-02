export default function Footer() {
  return (
    <footer className="border-t py-12 bg-accent/20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          <div>
            <h3 className="font-bold text-lg mb-4 text-primary">DriverSheet</h3>
            <p className="text-sm text-muted-foreground">
              Automate your gig earnings tracking
            </p>
          </div>
          
          <div>
            <h4 className="font-semibold mb-4">Product</h4>
            <ul className="space-y-2">
              <li>
                <a href="#features" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                  Features
                </a>
              </li>
              <li>
                <a href="#how-it-works" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                  How It Works
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-4">Legal</h4>
            <ul className="space-y-2">
              <li>
                <a href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                  Privacy Policy
                </a>
              </li>
              <li>
                <a href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                  Terms of Service
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-4">Contact</h4>
            <a href="mailto:support@driversheet.com" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              support@driversheet.com
            </a>
          </div>
        </div>

        <div className="border-t pt-8 text-center text-sm text-muted-foreground">
          © {new Date().getFullYear()} DriverSheet. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
