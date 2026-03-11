export type IntegrationProvider = {
  id: string;
  name: string;
  category: 'identity' | 'doi' | 'discovery' | 'metrics' | 'preservation';
  purpose: string;
  required: boolean;
  priority: 'now' | 'next' | 'later';
  status: 'planned' | 'in_progress' | 'ready';
  requiredEnv: string[];
  notes: string;
};

export const INTEGRATION_PROVIDERS: IntegrationProvider[] = [
  {
    id: 'orcid',
    name: 'ORCID OAuth',
    category: 'identity',
    purpose: '作者身份绑定与贡献者标准化（iD）',
    required: true,
    priority: 'now',
    status: 'in_progress',
    requiredEnv: ['ORCID_CLIENT_ID', 'ORCID_CLIENT_SECRET', 'ORCID_REDIRECT_URI'],
    notes: '当前已接入基础 OAuth 流程，后续补充 token 刷新与范围精细化控制。'
  },
  {
    id: 'crossref',
    name: 'Crossref Deposit API',
    category: 'doi',
    purpose: '注册正式 DOI 与元数据，形成公开可解析标识',
    required: true,
    priority: 'next',
    status: 'planned',
    requiredEnv: ['CROSSREF_MEMBER_ID', 'CROSSREF_USERNAME', 'CROSSREF_PASSWORD'],
    notes: '当前仅有内部 DOI 生成逻辑，下一阶段对接真实 deposit 接口并做回执轮询。'
  },
  {
    id: 'datacite',
    name: 'DataCite REST API',
    category: 'doi',
    purpose: '数据/软件对象 DOI（补充 Crossref 论文 DOI）',
    required: false,
    priority: 'later',
    status: 'planned',
    requiredEnv: ['DATACITE_REPOSITORY_ID', 'DATACITE_API_TOKEN'],
    notes: '适合数据集、代码包与复现实验工件。'
  },
  {
    id: 'openalex',
    name: 'OpenAlex API',
    category: 'discovery',
    purpose: '学术实体关联、引用网络与主题聚类增强',
    required: false,
    priority: 'next',
    status: 'planned',
    requiredEnv: [],
    notes: '可用于推荐相似论文、自动补齐作者/机构基础画像。'
  },
  {
    id: 'unpaywall',
    name: 'Unpaywall API',
    category: 'discovery',
    purpose: '开放获取状态校验，改进公共可访问性显示',
    required: false,
    priority: 'later',
    status: 'planned',
    requiredEnv: ['UNPAYWALL_EMAIL'],
    notes: '用于展示 OA 版本可达性，提升读者转化。'
  },
  {
    id: 'rord',
    name: 'ROR API',
    category: 'identity',
    purpose: '标准化机构标识，减少单位名称歧义',
    required: false,
    priority: 'next',
    status: 'planned',
    requiredEnv: [],
    notes: '编辑部可用于机构字段归一化与统计分析。'
  },
  {
    id: 'plumx',
    name: 'Altmetrics Provider',
    category: 'metrics',
    purpose: '展示社交传播、政策引用、新闻提及等替代指标',
    required: false,
    priority: 'later',
    status: 'planned',
    requiredEnv: ['ALTMETRIC_API_KEY'],
    notes: '可选接入 PlumX / Altmetric.com 等供应商。'
  },
  {
    id: 'clockss',
    name: 'Long-term Preservation Network',
    category: 'preservation',
    purpose: '长期归档与灾备，满足正式期刊可信存证要求',
    required: false,
    priority: 'later',
    status: 'planned',
    requiredEnv: [],
    notes: '可通过第三方托管平台或合作机构入网。'
  }
];

export type IntegrationReadiness = IntegrationProvider & {
  configured: boolean;
  missingEnv: string[];
};

export function getIntegrationReadiness(): IntegrationReadiness[] {
  return INTEGRATION_PROVIDERS.map((provider) => {
    const missingEnv = provider.requiredEnv.filter((envName) => !process.env[envName]);
    return {
      ...provider,
      configured: missingEnv.length === 0,
      missingEnv
    };
  });
}
