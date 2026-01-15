import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ConstructionIcon } from "lucide-react";

interface PlaceholderPageProps {
  title: string;
  description: string;
  features?: string[];
}

const PlaceholderPage = ({
  title,
  description,
  features,
}: PlaceholderPageProps) => {
  return (
    <Layout>
      <div className="container py-12">
        <div className="max-w-2xl mx-auto text-center">
          <Card>
            <CardHeader>
              <div className="mx-auto w-12 h-12 bg-brand-100 rounded-lg flex items-center justify-center mb-4">
                <ConstructionIcon className="h-6 w-6 text-brand-600" />
              </div>
              <CardTitle className="text-2xl">{title}</CardTitle>
              <CardDescription className="text-lg">
                {description}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {features && (
                <div className="text-left">
                  <h4 className="font-semibold mb-3">Coming Soon:</h4>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    {features.map((feature, index) => (
                      <li key={index} className="flex items-center">
                        <div className="w-1.5 h-1.5 bg-brand-500 rounded-full mr-3" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              <div className="text-center">
                <p className="text-sm text-muted-foreground mb-4">
                  This feature is under development. Continue prompting to help
                  build it out!
                </p>
                <Button variant="outline">Request Feature Development</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
};

export default PlaceholderPage;
