import { PageHero } from "@/components/site/page-hero";
import { TrackForm } from "@/components/site/track-form";

export const metadata = { title: "Track your order" };

export default function TrackPage() {
  return (
    <>
      <PageHero title="Track your order" description="Enter your order number and mobile number. No account needed." crumbs={[{ label: "Track order" }]} />
      <div className="container-x py-10"><TrackForm /></div>
    </>
  );
}
