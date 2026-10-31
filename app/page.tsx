import { Panels } from "@/components/panels"
import { TooltipProvider } from "@/components/ui/tooltip"

export default function Page() {
  return (
    <TooltipProvider>
      <Panels left={<div />} right={<div />} bottom={<div />}>
        {null}
      </Panels>
    </TooltipProvider>
  )
}
