import { SiteLang } from '@/lib/site-copy';

export const TERMS_VERSION = '2026-03-IF-v2';

export const AUTHOR_AGREEMENT_CHECKBOXES = {
  zh: [
    '我确认已获得所有署名作者的明确授权，并有权代表全体作者提交本稿件。',
    '我确认稿件为原创成果，未侵犯第三方权利，且对引用、改编、复用内容已进行准确标注并说明许可状态。',
    '我确认本研究已遵守适用的伦理、隐私、数据安全、资助披露与机构合规要求。',
    '我同意平台依据用户协议、隐私说明和编辑流程需要处理稿件、作者身份与联系信息。'
  ],
  en: [
    'I confirm that I have explicit authorization from all listed co-authors and am permitted to submit this manuscript on their behalf.',
    'I confirm that the manuscript is original, does not infringe third-party rights, and that reused or adapted material is accurately cited with permission status disclosed.',
    'I confirm that this work complies with applicable ethics, privacy, data-security, funding-disclosure, and institutional compliance requirements.',
    'I agree that the platform may process manuscript, identity, and contact information as required by the user agreement, privacy notice, and editorial workflow.'
  ]
} as const;

export const AUTHOR_AGREEMENT_OVERVIEW = {
  zh: {
    title: '作者协议与用户条款摘要',
    subtitle: '以下条款用于明确作者、共同作者、编辑部与平台之间的责任边界。提交前请完整阅读并确认。',
    summary: [
      '本平台主要发表严谨的增量研究、重复研究、阴性结果与方法改进工作。我们鼓励透明、可核查、可复现实证。',
      '提交行为代表通信作者已获得所有共同作者授权，并同意稿件进入编辑初筛、分配编辑、收集意见、做出决定、制作与发表的完整流程。',
      '用户协议不仅约束投稿时的勾选确认，也约束作者在修回、撤稿申请、伦理调查、版权说明、数据可得性说明中的持续义务。'
    ],
    protocolAck: '我已完整阅读并理解下列作者协议、平台用户条款、编辑流程与数据处理说明，并同意按其要求投稿。'
  },
  en: {
    title: 'Author agreement and user terms overview',
    subtitle: 'These terms define responsibility boundaries among authors, co-authors, the editorial office, and the platform. Please read them carefully before submission.',
    summary: [
      'This platform primarily publishes rigorous incremental studies, replications, negative findings, and methodological improvements. We value transparent, auditable, and reproducible evidence.',
      'Submission represents that the corresponding author has authorization from all co-authors and agrees to the full editorial lifecycle: screening, editor assignment, recommendation collection, decision, production, and publication.',
      'The user agreement applies not only to the submission checkboxes, but also to the author’s continuing obligations during revision, withdrawal requests, ethics review, rights declarations, and data-availability updates.'
    ],
    protocolAck: 'I have fully read and understood the author agreement, platform user terms, editorial workflow, and data-processing notice below, and I agree to submit under those terms.'
  }
} as const;

export const AUTHOR_AGREEMENT_SECTIONS = {
  zh: [
    {
      title: '一、作者资格与署名责任',
      points: [
        '通信作者必须确保所有署名作者都实际参与了研究或稿件形成，并已知晓本次投稿。',
        '作者顺序、单位、通讯方式应与稿件首页、元数据、补充材料中的声明保持一致。',
        '如存在共同一作、共同通讯作者、数据贡献者或技术支持者，应在 cover letter 或文稿说明中清晰披露。',
        '未获授权擅自加入、删除或调整署名顺序，可能导致退稿、撤稿或伦理调查。'
      ]
    },
    {
      title: '二、原创性、重复投稿与版权说明',
      points: [
        '稿件应为作者拥有合法提交权利的原创工作；对已公开版本、预印本、会议摘要、注册报告或并行投稿，应在投稿信中明确说明。',
        '任何复用图表、照片、数据表、问卷、代码片段或长段落文本，都必须标明来源并说明是否已获得许可。',
        '平台鼓励与预印本、开放代码库和开放数据配套，但作者需要保证这些公开材料与投稿版本之间的关系可解释、可追溯。'
      ]
    },
    {
      title: '三、伦理、隐私与合规',
      points: [
        '涉及人类参与者、动物实验、敏感数据、机构内部材料或受限制样本的研究，作者应披露伦理审批、知情同意和适用限制。',
        '如研究不需要伦理审批，也应提供合理说明，而不是简单留空。',
        '投稿文件中不得包含违法披露的个人敏感信息、受保护健康信息、未脱敏身份标识或不应公开的商业秘密。',
        '若后续发现伦理、版权或数据合规问题，作者应及时通知编辑部并配合修正、勘误、撤回或调查。'
      ]
    },
    {
      title: '四、数据、方法与可复现性义务',
      points: [
        '作者应尽可能提供足够的方法细节，使同行能够理解研究设计、复现实验逻辑或审查分析路径。',
        '如数据、代码、材料不能公开，应说明限制原因、可申请访问方式或替代验证方案。',
        '阴性结果、失败复现、边界条件修正与增量改进同样具有学术价值，作者不得为了“更好看”而隐藏关键结果。'
      ]
    },
    {
      title: '五、编辑流程、修回与发表',
      points: [
        '作者理解并同意稿件会经过编辑初筛、稿件分配、意见收集、最终决定、制作与公开发布等流程节点。',
        '如收到小修或大修意见，作者应在合理期限内提交修订说明，并对主要问题逐项回应。',
        '稿件被接收后，作者仍需配合制作、元数据校对、版权说明、DOI/发布信息确认及公开页面核对。',
        '平台保留对明显不符合范围、合规要求或质量底线的稿件作出拒稿、暂缓、要求补件或启动伦理审查的权利。'
      ]
    },
    {
      title: '六、平台数据处理与服务边界',
      points: [
        '平台会处理投稿元数据、文件、审稿流程记录、联系信息和必要的审计日志，以维持编辑流程、安全风控和发布服务。',
        '平台不承诺所有稿件都会被接收，也不承诺特定审稿时长、引用表现或外部数据库收录结果。',
        '作者可请求更正账户信息或稿件元数据；但涉及已发布记录、审计记录或合规要求的内容，平台可能保留必要历史痕迹。'
      ]
    }
  ],
  en: [
    {
      title: '1. Authorship qualification and responsibility',
      points: [
        'The corresponding author must ensure that every listed author made a genuine contribution to the work or manuscript and is aware of this submission.',
        'Author order, affiliations, and contact information should match the manuscript front page, metadata, and supporting declarations.',
        'Shared first authorship, co-corresponding authorship, data contributors, or technical contributors should be disclosed clearly in the cover letter or manuscript notes.',
        'Unauthorized addition, removal, or reordering of authors may result in rejection, withdrawal, or an ethics review.'
      ]
    },
    {
      title: '2. Originality, duplicate submission, and rights notice',
      points: [
        'The manuscript should be an original work that the authors have the legal right to submit; preprints, conference abstracts, registered reports, or parallel submissions must be disclosed in the cover letter.',
        'Any reused figures, images, tables, questionnaires, code snippets, or substantial text must be cited properly and accompanied by a permission-status statement when required.',
        'The platform welcomes linkage to preprints, open code repositories, and open datasets, but the relationship between those materials and the submitted version must remain interpretable and traceable.'
      ]
    },
    {
      title: '3. Ethics, privacy, and compliance',
      points: [
        'Research involving human participants, animals, sensitive data, institutional materials, or restricted samples should disclose ethics approval, consent context, and applicable limitations.',
        'If no formal ethics approval was required, authors should provide a reasoned statement rather than leaving the field blank.',
        'Submission files must not contain unlawfully disclosed personal sensitive information, protected health data, unanonymized identifiers, or confidential trade secrets that should not be public.',
        'If ethics, copyright, or data-compliance issues are discovered later, authors must promptly notify the editorial office and cooperate with corrections, withdrawals, or investigations.'
      ]
    },
    {
      title: '4. Data, methods, and reproducibility obligations',
      points: [
        'Authors should provide sufficient methodological detail so that peers can understand the design, reproduce the logic, or audit the analysis path.',
        'If data, code, or materials cannot be shared openly, the submission should explain the restriction, access conditions, or alternative verification arrangements.',
        'Negative findings, failed replications, boundary-condition clarifications, and incremental improvements remain valuable contributions; authors should not hide essential results for presentation reasons.'
      ]
    },
    {
      title: '5. Editorial workflow, revision, and publication',
      points: [
        'Authors understand and agree that the manuscript may pass through editorial screening, assignment, recommendation collection, final decision, production, and public release stages.',
        'If minor or major revision is requested, authors should return a revision explanation within a reasonable timeframe and respond point-by-point to the major concerns.',
        'After acceptance, authors are still expected to cooperate with production checks, metadata review, rights clarifications, DOI/publication information confirmation, and final public-page verification.',
        'The platform reserves the right to reject, pause, request supplementary materials for, or place under ethics review any manuscript that falls outside scope or fails basic compliance or quality requirements.'
      ]
    },
    {
      title: '6. Platform data processing and service boundaries',
      points: [
        'The platform processes submission metadata, files, review-flow records, contact information, and necessary audit logs to operate editorial workflow, security, and publication services.',
        'The platform does not guarantee acceptance, a specific review duration, citation performance, or inclusion in third-party indexes.',
        'Authors may request corrections to account or manuscript metadata; however, published records, audit trails, and compliance-related history may require preservation of an immutable record.'
      ]
    }
  ]
} as const;

export function getAuthorAgreement(lang: SiteLang) {
  return {
    overview: AUTHOR_AGREEMENT_OVERVIEW[lang],
    sections: AUTHOR_AGREEMENT_SECTIONS[lang],
    checkboxes: AUTHOR_AGREEMENT_CHECKBOXES[lang]
  };
}
