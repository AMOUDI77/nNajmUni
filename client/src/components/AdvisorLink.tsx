import { Link } from "react-router-dom";
import { applicationUrl, type Inquiry } from "../discovery";
import WhatsAppIcon from "./WhatsAppIcon";
export default function AdvisorLink({ context = {}, className = "student-button secondary" }: {
  context?: Inquiry; children?: React.ReactNode; className?: string;
}) {
  return <Link className={className} to={applicationUrl(context)}><WhatsAppIcon />يلا ابدأ قبولك</Link>;
}
