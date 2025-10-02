import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";
import Image from "next/image";

export default function Hero() {
  return (
    <section className="relative min-h-[80vh] flex items-center overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-background to-background" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 py-20 md:py-32">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left Side - Text Content */}
          <div className="max-w-2xl">
            <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold mb-6 leading-tight">
              Your Gig Earnings,{" "}
              <span className="text-primary">Automatically Tracked</span>
            </h1>
            
            <p className="text-lg md:text-xl text-muted-foreground mb-8">
              Forward payout emails. We parse the PDFs. Your Google Sheet updates automatically.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 mb-8">
              <Link href="/auth">
                <Button size="lg" className="text-base">
                  Start Tracking Free
                </Button>
              </Link>
              <Button size="lg" variant="outline" className="text-base backdrop-blur-sm">
                Learn More
              </Button>
            </div>

            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Check className="h-4 w-4 text-primary" />
              <span>No credit card required · 7-day trial</span>
            </div>
          </div>

          {/* Right Side - Image */}
          <div className="relative hidden lg:block">
            <div className="relative w-full aspect-[4/3] rounded-2xl overflow-hidden shadow-2xl border border-border/50 bg-slate-900">
              <Image
                src="/hero-mockup.svg"
                alt="DriverSheet Dashboard Preview"
                fill
                className="object-cover"
                priority
              />
            </div>
            
            {/* Decorative elements */}
            <div className="absolute -top-4 -right-4 w-24 h-24 bg-primary/20 rounded-full blur-3xl" />
            <div className="absolute -bottom-8 -left-8 w-32 h-32 bg-primary/10 rounded-full blur-3xl" />
          </div>
        </div>
      </div>
    </section>
  );
}
