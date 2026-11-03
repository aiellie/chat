import { ExtensionsPage } from "@/components/extensions-page"
import { bundledSkills } from "@/lib/bundled-skills"

export default function Page() {
  return <ExtensionsPage bundled={bundledSkills()} />
}
