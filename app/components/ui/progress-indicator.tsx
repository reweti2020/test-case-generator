interface ProgressIndicatorProps {
  elementType: string | null
  elementIndex: number
  processed: {
    buttons: number
    forms: number
    links: number
    inputs: number
  }
  pageData: {
    buttons: any[]
    forms: any[]
    links: any[]
    inputs: any[]
  }
}

export function ProgressIndicator({ elementType, elementIndex, processed, pageData }: ProgressIndicatorProps) {
  // Calculate progress percentages
  const buttonProgress =
    pageData.buttons?.length > 0 ? Math.round((processed.buttons / pageData.buttons.length) * 100) : 100

  const formProgress = pageData.forms?.length > 0 ? Math.round((processed.forms / pageData.forms.length) * 100) : 100

  const linkProgress = pageData.links?.length > 0 ? Math.round((processed.links / pageData.links.length) * 100) : 100

  const inputProgress =
    pageData.inputs?.length > 0 ? Math.round((processed.inputs / pageData.inputs.length) * 100) : 100

  // Calculate overall progress
  const totalElements =
    (pageData.buttons?.length || 0) +
    (pageData.forms?.length || 0) +
    (pageData.links?.length || 0) +
    (pageData.inputs?.length || 0)

  const processedElements =
    (processed.buttons || 0) + (processed.forms || 0) + (processed.links || 0) + (processed.inputs || 0)

  const overallProgress = totalElements > 0 ? Math.round((processedElements / totalElements) * 100) : 100

  // Determine next element text
  const elementTypes = {
    button: "Button",
    form: "Form",
    link: "Link",
    input: "Input Field",
  }

  const nextElementText = elementType
    ? `Next up: ${elementTypes[elementType as keyof typeof elementTypes] || "Element"} #${elementIndex + 1}`
    : "All elements processed"

  return (
    <div className="progress-info">
      <div className="progress-text">
        {nextElementText} - {overallProgress}% complete
      </div>
      <div className="progress-bar">
        <div className="progress-fill" style={{ width: `${overallProgress}%` }}></div>
      </div>

      <div className="grid grid-cols-4 gap-2 mt-2 text-xs">
        <div>
          <div className="text-center">Buttons</div>
          <div className="progress-bar h-1">
            <div className="progress-fill bg-blue-500" style={{ width: `${buttonProgress}%` }}></div>
          </div>
        </div>
        <div>
          <div className="text-center">Forms</div>
          <div className="progress-bar h-1">
            <div className="progress-fill bg-green-500" style={{ width: `${formProgress}%` }}></div>
          </div>
        </div>
        <div>
          <div className="text-center">Links</div>
          <div className="progress-bar h-1">
            <div className="progress-fill bg-purple-500" style={{ width: `${linkProgress}%` }}></div>
          </div>
        </div>
        <div>
          <div className="text-center">Inputs</div>
          <div className="progress-bar h-1">
            <div className="progress-fill bg-orange-500" style={{ width: `${inputProgress}%` }}></div>
          </div>
        </div>
      </div>
    </div>
  )
}
