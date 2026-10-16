import { useCopy } from '../copy';
import { Link } from "react-router-dom";
import { applicationUrl, type Inquiry } from "../discovery";
import WhatsAppIcon from "./WhatsAppIcon";
export default function AdvisorLink({ context = {}, className = "student-button secondary" }: {
  context?: Inquiry; children?: React.ReactNode; className?: string;
}) {
  const { tr, language: copyLanguage } = useCopy();
  return <Link className={className} to={applicationUrl(context)}><WhatsAppIcon />{tr("يلا ابدأ قبولك")}</Link>;
}
