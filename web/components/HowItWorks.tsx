import { Mail, FileCheck, TableProperties } from "lucide-react";
import { Card } from "@/components/ui/card";

const steps = [
  {
    icon: Mail,
    title: "Forward Email",
    description: "Forward your payout emails to your unique DriverSheet address",
    color: "text-primary"
  },
  {
    icon: FileCheck,
    title: "We Parse PDFs",
    description: "Our system automatically extracts earnings data from PDF attachments",
    color: "text-primary"
  },
  {
    icon: TableProperties,
    title: "Sheet Auto-Updates",
    description: "Your Google Sheet updates in real-time with all your earnings data",
    color: "text-primary"
  }
];

export default function HowItWorks() {
  return (
    <section id="how-it-works" className="py-20 md:py-32 bg-accent/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            How It Works
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Three simple steps to automate your earnings tracking
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {steps.map((step, index) => (
            <Card key={index} className="p-8">
              <div className="flex flex-col items-center text-center">
                <div className="mb-6 p-4 bg-primary/10 rounded-lg">
                  <step.icon className={`h-8 w-8 ${step.color}`} />
                </div>
                <h3 className="text-xl font-semibold mb-3">
                  {step.title}
                </h3>
                <p className="text-muted-foreground">
                  {step.description}
                </p>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
