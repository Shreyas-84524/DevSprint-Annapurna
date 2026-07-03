import { CheckCircle, AlertTriangle, Dog } from "lucide-react";

export default function StandardsPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-16 sm:px-6 lg:px-8">
      <h1 className="text-4xl font-black text-brand-charcoal mb-8 text-center">Food Safety Standards</h1>
      
      <div className="prose prose-lg max-w-none text-gray-600">
        <p className="text-xl leading-relaxed mb-12 text-center">
          The health and safety of our beneficiaries is paramount. Annapurna enforces strict Quality Control (QC) checkpoints throughout the donation lifecycle.
        </p>

        <h2 className="text-2xl font-bold text-brand-charcoal mt-12 mb-6 flex items-center gap-2">
          <CheckCircle className="text-green-500" /> Donor Responsibilities
        </h2>
        <ul className="space-y-4 bg-white p-6 rounded-xl border border-gray-200">
          <li className="flex items-start gap-3">
            <span className="font-bold text-brand-charcoal w-1/4 shrink-0">Temperature Control:</span> 
            <span>Hot food must be kept above 60°C and cold food below 5°C until pickup.</span>
          </li>
          <li className="flex items-start gap-3">
            <span className="font-bold text-brand-charcoal w-1/4 shrink-0">Accurate Listing:</span> 
            <span>Donors must accurately declare the time the food was prepared and the expected safe consumption window.</span>
          </li>
          <li className="flex items-start gap-3">
            <span className="font-bold text-brand-charcoal w-1/4 shrink-0">Packaging:</span> 
            <span>Food must be packed in clean, sealed, food-grade containers to prevent contamination during transit.</span>
          </li>
        </ul>

        <h2 className="text-2xl font-bold text-brand-charcoal mt-12 mb-6 flex items-center gap-2">
          <AlertTriangle className="text-yellow-500" /> Volunteer Quality Check (QC)
        </h2>
        <p className="mb-4">
          Before confirming a pickup, volunteers are mandated to perform a standardized physical check:
        </p>
        <div className="bg-yellow-50 p-6 rounded-xl border border-yellow-200">
          <h3 className="font-bold text-brand-charcoal mb-2">The Visual & Olfactory Pass</h3>
          <p>
            Volunteers must check for secure packaging, appropriate temperature to the touch, and the absence of any signs of spoilage (foul odor, discoloration, or mold). If the food fails this check, it must be rejected in the app, and the donor will be flagged.
          </p>
        </div>

        <h2 className="text-2xl font-bold text-brand-charcoal mt-12 mb-6 flex items-center gap-2">
          <Dog className="text-brand-charcoal" /> Expiry and Animal Rerouting
        </h2>
        <p>
          Food listed on Annapurna is subjected to a strict digital timer. If the food is within 2 hours of its declared expiry and remains unassigned to a beneficiary, its status changes to "Animal Reroute." It is no longer eligible for human consumption and will be directed to verified street dog feeders or local animal shelters. This ensures no food goes to waste while strictly preventing human consumption of potentially unsafe items.
        </p>
      </div>
    </div>
  );
}
