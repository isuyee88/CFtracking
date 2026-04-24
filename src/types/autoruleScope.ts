export type AutoruleScopeType = 'global' | 'traffic_source' | 'campaign';

export type AutoruleScopeMode = 'inherit' | 'off' | 'rules' | 'whitelist_gate';

export interface AutoruleScopeBinding {
  ruleId: string;
  priority: number;
  enabled?: boolean;
  updatedAt?: string;
}

export interface AutoruleScopeConfig {
  id?: string;
  scopeType: AutoruleScopeType;
  scopeId: string;
  mode: AutoruleScopeMode;
  enabled: boolean;
  bindings: AutoruleScopeBinding[];
  createdAt?: string;
  updatedAt: string;
}

export interface SaveAutoruleScopeConfigInput {
  mode: AutoruleScopeMode;
  enabled?: boolean;
  bindings?: Array<{
    ruleId: string;
    priority?: number;
    enabled?: boolean;
  }>;
}

export interface EffectiveAutoruleScopeResolution {
  effectiveConfig: AutoruleScopeConfig | null;
  hasExplicitConfig: boolean;
  scannedScopeTypes: AutoruleScopeType[];
}
