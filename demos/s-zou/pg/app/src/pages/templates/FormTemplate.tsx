import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { TreeNode } from "@/components/layout/TreeNav";
import { templateTreeItems, templateRoutes } from "@/data/templateTree";
import { TemplateBanner } from "@/components/ui/template-banner";
import { Button } from "@/components/ui/button";
import {
  FormToolbar,
  FormComponentPicker,
  FormOrderDetails,
  FormRadioOptions,
  FormConditionalSection,
} from "@/components/form";
import celonisLogo from "@/assets/celonis-logo.png";

export default function FormTemplate() {
  const navigate = useNavigate();
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedOption, setSelectedOption] = useState<string | undefined>();

  const handleTreeSelect = (node: TreeNode) => {
    if (templateRoutes[node.id]) {
      navigate(templateRoutes[node.id]);
    }
  };

  return (
    <AppLayout
      treeItems={templateTreeItems}
      activeTreeId="template-form"
      onTreeSelect={handleTreeSelect}
      breadcrumbs={[
        { label: "Studio" },
        { label: "Templates" },
        { label: "Form" },
      ]}
      showTree={true}
      className="p-0"
    >
      <div className="h-full flex flex-col">
        {/* Form Toolbar */}
        <FormToolbar
          formName="Sample Form"
          isEditMode={isEditMode}
          onSubmissions={() => console.log("Open submissions")}
          onEdit={() => setIsEditMode(true)}
          onExitEdit={() => setIsEditMode(false)}
        />

        {/* Template Banner */}
        {!isEditMode && (
          <TemplateBanner
            title="Form Template"
            description="Create interactive forms with validation and conditional logic. Edit mode shows the component picker."
          />
        )}

        {/* Main Content */}
        <div className="flex-1 flex overflow-hidden">
          {/* Form Preview Area */}
          <div className="flex-1 overflow-auto bg-background">
            <div className="max-w-6xl mx-auto p-6">
              {/* Form Container */}
              <div className="bg-card border border-border rounded-lg shadow-sm">
                {/* Header with Logo */}
                <div className="flex flex-col items-center py-8 border-b border-border bg-muted/20">
                  <img
                    src={celonisLogo}
                    alt="Celonis"
                    className="h-12 mb-4"
                  />
                  <h1 className="text-2xl font-semibold text-foreground">
                    Request for Order Confirmation
                  </h1>
                </div>

                {/* Form Content */}
                <div className="p-6 space-y-6">
                  {/* Order Details Section */}
                  <FormOrderDetails />

                  {/* Radio Options */}
                  <FormRadioOptions
                    value={selectedOption}
                    onChange={setSelectedOption}
                  />

                  {/* Conditional Sections based on selection */}
                  <FormConditionalSection selectedOption={selectedOption} />
                </div>

                {/* Submit Button */}
                <div className="flex justify-end px-6 py-4 border-t border-border bg-muted/10">
                  <Button
                    variant="outline"
                    disabled={!selectedOption}
                    className="px-6"
                  >
                    Submit
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Component Picker Side Panel (Edit Mode) */}
          <FormComponentPicker
            isOpen={isEditMode}
            onSelectComponent={(type) => console.log("Add component:", type)}
          />
        </div>
      </div>
    </AppLayout>
  );
}
