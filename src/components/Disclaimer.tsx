import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

export function Disclaimer() {
  return (
    <div className="space-y-3">
      <Alert variant="destructive" className="border-amber-500/50 bg-amber-500/10 text-amber-900 dark:text-amber-100">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription className="text-sm">
          <strong>Important Disclaimers:</strong>
          <ul className="mt-2 ml-4 list-disc space-y-1">
            <li>
              <strong>Not Financial Advice:</strong> This tool is for informational and educational purposes only. It does not constitute financial, investment, or trading advice. Always consult with a qualified financial advisor before making investment decisions.
            </li>
            <li>
              <strong>No eToro Affiliation:</strong> This project is an independent analysis tool and is not affiliated with, endorsed by, or connected to eToro in any way. eToro is a registered trademark of eToro Group Ltd.
            </li>
            <li>
              <strong>Data Accuracy:</strong> While we strive for accuracy, data is provided "as is" without warranties. Past performance does not guarantee future results. Investment performance can vary significantly.
            </li>
            <li>
              <strong>Risk Warning:</strong> Trading and investing involve substantial risk of loss. You may lose all of your invested capital. Only invest money you can afford to lose.
            </li>
          </ul>
        </AlertDescription>
      </Alert>
    </div>
  );
}
