import { useState } from "react";
import { Cpu, PlugZap, Save } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import type { EngineerSettings } from "@/lib/engineer/types";

export interface ProviderFormValues {
  base_url: string;
  model: string;
  price_per_million_tokens: number;
  monthly_budget_usd: number;
  target_branch: string;
  deploy_workflow: string;
  deployment_enabled: boolean;
}

interface Props {
  settings: EngineerSettings | null;
  busy: boolean;
  onSave: (values: ProviderFormValues) => Promise<void>;
  onTest: () => Promise<void>;
}

/**
 * Provider-flexible settings: any OpenAI-compatible endpoint. No provider is
 * preselected; the API key itself lives in the ENGINEER_LLM_API_KEY secret and
 * is never shown or typed here.
 */
export function ProviderSettings({ settings, busy, onSave, onTest }: Props) {
  const [values, setValues] = useState<ProviderFormValues>({
    base_url: settings?.llm_base_url ?? "",
    model: settings?.llm_model ?? "",
    price_per_million_tokens: settings?.llm_price_per_million_tokens ?? 0,
    monthly_budget_usd: settings?.llm_monthly_budget_usd ?? 5,
    target_branch: settings?.target_branch ?? "main",
    deploy_workflow: settings?.deploy_workflow ?? "",
    deployment_enabled: settings?.deployment_enabled ?? false,
  });

  return (
    <Collapsible>
      <CollapsibleTrigger className="flex w-full items-center justify-between rounded-xl border border-border bg-card px-3 py-2.5 text-sm font-medium text-foreground">
        <span className="flex items-center gap-2">
          <Cpu className="h-4 w-4" /> Provider &amp; deployment settings
        </span>
        <span className="text-[10px] font-normal text-muted-foreground">
          {values.model || "no model selected"}
        </span>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="mt-2 space-y-3 rounded-xl border border-border bg-card p-3">
          <p className="text-xs text-muted-foreground">
            Any OpenAI-compatible endpoint works. The key is stored as the ENGINEER_LLM_API_KEY
            secret — never entered here, never exposed to the browser or to build/test code.
          </p>

          <div className="space-y-1">
            <Label htmlFor="engineer-base-url">API base URL</Label>
            <Input
              id="engineer-base-url"
              value={values.base_url}
              placeholder="https://your-provider.example/v1"
              onChange={(event) => setValues({ ...values, base_url: event.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label htmlFor="engineer-model">Model</Label>
              <Input
                id="engineer-model"
                value={values.model}
                placeholder="model-id"
                onChange={(event) => setValues({ ...values, model: event.target.value })}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="engineer-price">Price / 1M tokens ($)</Label>
              <Input
                id="engineer-price"
                type="number"
                step="0.01"
                min="0"
                value={values.price_per_million_tokens}
                onChange={(event) =>
                  setValues({
                    ...values,
                    price_per_million_tokens: Number(event.target.value) || 0,
                  })
                }
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label htmlFor="engineer-budget">Monthly budget ($)</Label>
              <Input
                id="engineer-budget"
                type="number"
                step="0.5"
                min="0"
                value={values.monthly_budget_usd}
                onChange={(event) =>
                  setValues({ ...values, monthly_budget_usd: Number(event.target.value) || 0 })
                }
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="engineer-target">Target branch</Label>
              <Input
                id="engineer-target"
                value={values.target_branch}
                onChange={(event) => setValues({ ...values, target_branch: event.target.value })}
              />
            </div>
          </div>

          <div className="space-y-1">
            <Label htmlFor="engineer-deploy">Deployment workflow file</Label>
            <Input
              id="engineer-deploy"
              value={values.deploy_workflow}
              placeholder="deploy.yml"
              onChange={(event) => setValues({ ...values, deploy_workflow: event.target.value })}
            />
            <p className="text-[11px] text-muted-foreground">
              Deployment is only ever a repository workflow dispatch. Until that file exists and is
              enabled, approvals merge but report deployment as unavailable.
            </p>
          </div>

          <div className="flex items-center justify-between rounded-md border border-border px-3 py-2">
            <div>
              <p className="text-sm text-foreground">Enable deployment</p>
              <p className="text-[11px] text-muted-foreground">
                Off = merge only, never dispatch a deploy.
              </p>
            </div>
            <Switch
              checked={values.deployment_enabled}
              onCheckedChange={(checked) => setValues({ ...values, deployment_enabled: checked })}
              aria-label="Enable deployment"
            />
          </div>

          <div className="flex gap-2">
            <Button
              size="sm"
              className="flex-1"
              disabled={busy}
              onClick={() => void onSave(values)}
            >
              <Save className="mr-1.5 h-4 w-4" /> Save
            </Button>
            <Button
              size="sm"
              variant="secondary"
              className="flex-1"
              disabled={busy}
              onClick={() => void onTest()}
            >
              <PlugZap className="mr-1.5 h-4 w-4" /> Test connection
            </Button>
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
