import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

export function Disclaimer() {
  return (
    <Alert className="border-gray-300 bg-gray-50 text-gray-700">
      <AlertCircle className="h-3.5 w-3.5 opacity-70" />
      <AlertDescription className="text-xs leading-relaxed">
        <strong>Disclaimer:</strong> This tool is for informational purposes only and does not constitute financial advice. This is an independent project not affiliated with eToro. Data is provided "as is" without warranties. Past performance does not guarantee future results. Trading involves substantial risk of loss.
      </AlertDescription>
    </Alert>
  );
}
