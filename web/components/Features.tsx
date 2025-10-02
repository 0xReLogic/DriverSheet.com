import { Zap, Shield, Clock, TrendingUp } from "lucide-react";

const features = [
  {
    icon: Zap,
    title: "Real-time Sync",
    description: "Earnings data syncs to your Google Sheet instantly as emails arrive"
  },
  {
    icon: Shield,
    title: "Secure & Private",
    description: "Your data is encrypted and we never share your information"
  },
  {
    icon: Clock,
    title: "Save Time",
    description: "No more manual data entry. Focus on driving, not spreadsheets"
  },
  {
    icon: TrendingUp,
    title: "Track Everything",
    description: "Gross earnings, tips, mileage - all organized in one place"
  }
];

export default function Features() {
  return (
    <section id="features" className="py-20 md:py-32">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Everything You Need
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Powerful features designed specifically for gig drivers
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {features.map((feature, index) => (
            <div key={index} className="text-center">
              <div className="inline-flex items-center justify-center p-3 bg-primary/10 rounded-lg mb-4">
                <feature.icon className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-lg font-semibold mb-2">
                {feature.title}
              </h3>
              <p className="text-muted-foreground text-sm">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
