import { SiteLang } from '@/lib/site-copy';

export const TERMS_VERSION = '2026-03-IF-v3';

export const AUTHOR_AGREEMENT_CHECKBOXES = {
  zh: [
    '我确认已获得所有署名作者的明确授权，并有权代表全体作者提交本稿件。',
    '我确认稿件为原创成果，未侵犯第三方权利，且对引用、改编、复用内容已进行准确标注并说明许可状态。',
    '我确认本研究或作品已遵守适用的伦理、隐私、数据安全、资助披露、平台合规与机构要求。',
    '我同意平台依据用户协议、隐私说明和编辑流程需要处理稿件、作者身份、版本记录与联系信息。'
  ],
  en: [
    'I confirm that I have explicit authorization from all listed co-authors and am permitted to submit this manuscript on their behalf.',
    'I confirm that the manuscript is original, does not infringe third-party rights, and that reused or adapted material is accurately cited with permission status disclosed.',
    'I confirm that this research or creative work complies with applicable ethics, privacy, data-security, funding-disclosure, platform, and institutional requirements.',
    'I agree that the platform may process manuscript, identity, version-history, and contact information as required by the user agreement, privacy notice, and editorial workflow.'
  ]
} as const;

export const AUTHOR_AGREEMENT_OVERVIEW = {
  zh: {
    title: '作者协议与双轨投稿条款摘要',
    subtitle: '平台同时接收学术研讨稿与自由创作稿。提交前请确认你选择的分区、版本目标、版权安排与 DOI 规则。',
    summary: [
      '学术研讨区主要面向增量研究、重复研究、阴性结果、方法改进与讨论稿，强调可核查、可修订、可转正。',
      '自由创作区主要面向科普评论、研究随笔、实验性表达与娱乐化内容，平台重点审核合法合规、署名与版权，不按学术论文标准要求 DOI。',
      '投稿行为代表通信作者已获得共同作者授权，并同意稿件进入编辑初筛、版本记录、修订沟通、公开展示与后续出版决策流程。'
    ],
    protocolAck: '我已完整阅读并理解下列作者协议、双轨审核规则、版本控制方案、版权安排与 DOI 触发机制，并同意按其要求投稿。'
  },
  en: {
    title: 'Author agreement and dual-track submission overview',
    subtitle: 'The platform accepts both academic-review submissions and creative/entertainment submissions. Please confirm the selected track, version goal, rights arrangement, and DOI rules before submission.',
    summary: [
      'The academic review track is designed for incremental studies, replications, negative findings, methodological improvements, and discussion drafts with an emphasis on auditable revision and eventual formalization.',
      'The creative/entertainment track is designed for science communication, commentary, playful experiments, and other compliant public-facing pieces; the main review focus is legality, attribution, and platform safety rather than formal scholarly DOI qualification.',
      'Submitting represents that the corresponding author has authorization from all co-authors and agrees to screening, version logging, revision communication, public display, and any later publication decision.'
    ],
    protocolAck: 'I have fully read and understood the author agreement, dual-track review rules, version-control policy, rights arrangement, and DOI trigger mechanism below, and I agree to submit under those terms.'
  }
} as const;

export const AUTHOR_AGREEMENT_SECTIONS = {
  zh: [
    {
      title: '一、分区选择与适用标准',
      points: [
        '学术研讨区适用较严格的研究诚信、方法透明与证据可核查标准；伪造、篡改、抄袭或误导性署名将导致拒稿、撤稿或伦理调查。',
        '自由创作区可采用评论、随笔、戏仿、实验性叙事等表达方式，但仍必须遵守适用法律、平台合规、署名真实与版权规则。',
        '作者应在投稿时如实选择分区。平台可在必要时要求作者改投另一分区，或在沟通后调整公开展示定位。'
      ]
    },
    {
      title: '二、作者资格、署名与原创性责任',
      points: [
        '通信作者必须确保所有署名作者都实际参与了研究、创作或稿件形成，并已知晓本次投稿。',
        '作者顺序、单位、通讯方式应与稿件首页、元数据与补充说明一致；共同一作、共同通讯作者或特别贡献者应明确披露。',
        '投稿内容必须由作者合法持有提交权利。预印本、会议摘要、外部平台已公开版本或改编来源，应在投稿信中说明关系与差异。'
      ]
    },
    {
      title: '三、版权、首发与优先出版权',
      points: [
        '未获得 DOI 或正式出版决定前，作者保留作品原始版权；平台仅获得为审核、存档、展示讨论版与保存版本记录所必需的非独占许可。',
        '若作者申请将学术研讨稿转为正式版并进入制作发布流程，作者同意平台对该正式版享有优先出版权与首发记录权。',
        '自由创作区内容默认作为公开展示作品处理，除非另有书面说明，平台不主张独占版权，但保留维持公开页面与审计记录的必要权利。'
      ]
    },
    {
      title: '四、版本控制与正式版关系',
      points: [
        '平台会对投稿与修订记录进行版本管理。V1 可作为讨论稿或孵化稿公开，后续 V2/V3 等修订版可继续追加回应、补证与说明。',
        '如学术研讨稿后续通过正式审核并进入出版，DOI 仅指向最终定稿版；早期讨论版继续保留为可追溯历史版本。',
        '作者在修回、撤回、勘误或版权澄清时，应配合说明各版本差异，避免不同公开版本之间发生实质性冲突或误导。'
      ]
    },
    {
      title: '五、DOI 触发机制与编辑流程',
      points: [
        'DOI 不是自动分配。作者需在学术研讨区稿件达到正式发表标准后主动申请，编辑部完成审核、制作与元数据核验后方可分配。',
        '学术研讨区稿件可先以“讨论版 / 孵化版”身份公开，再在修订充分后进入正式版流程。编辑部保留要求补件、继续修订或拒绝 DOI 申请的权利。',
        '自由创作区内容原则上不分配 DOI，也不承诺进入正式学术出版流程，但仍可能获得编辑推荐、专题展示或公开归档。'
      ]
    },
    {
      title: '六、伦理、隐私、数据与平台边界',
      points: [
        '涉及人类参与者、动物实验、敏感数据、受限制样本或机构内部材料的稿件，作者应披露伦理审批、同意机制与适用限制。',
        '如数据、代码、材料不能公开，应说明限制原因、可申请访问方式或替代验证方案；自由创作内容如含虚构、戏仿或 AI 辅助生成，也应避免误导性呈现。',
        '平台处理投稿元数据、文件、版本记录、审核日志与联系信息，以支持编辑流程、安全风控、公开展示与合规审计；平台不保证接收、审稿时长、引用表现或第三方数据库收录。'
      ]
    }
  ],
  en: [
    {
      title: '1. Track selection and applicable standards',
      points: [
        'The academic review track applies stricter standards for research integrity, methodological transparency, and auditable evidence; fabrication, falsification, plagiarism, or misleading authorship may lead to rejection, removal, or an ethics review.',
        'The creative/entertainment track may use commentary, essays, parody, or experimental narrative forms, but it must still comply with applicable law, platform rules, authentic attribution, and copyright obligations.',
        'Authors should select the track truthfully at submission time. The platform may request transfer to another track or adjust the public presentation after editorial communication.'
      ]
    },
    {
      title: '2. Authorship, attribution, and originality responsibility',
      points: [
        'The corresponding author must ensure that all listed authors genuinely contributed to the research, creative work, or manuscript and are aware of this submission.',
        'Author order, affiliations, and contact details should match the manuscript front page, metadata, and supporting notes; shared-first, co-corresponding, or special contributors should be disclosed clearly.',
        'The submitted content must be something the authors legally have the right to submit. Preprints, conference abstracts, publicly posted versions on other platforms, or adapted source material must be disclosed in the cover letter together with their relationship to this version.'
      ]
    },
    {
      title: '3. Rights, first release, and publication priority',
      points: [
        'Before DOI assignment or a formal publication decision, authors retain the underlying copyright in the work; the platform only receives the non-exclusive rights needed to review, archive, display the discussion version, and preserve version history.',
        'If the author requests conversion of an academic discussion draft into a formal publication and it enters production, the author agrees that the platform has first-publication priority for that formal version.',
        'Creative/entertainment submissions are treated as public-display works by default. Unless otherwise agreed in writing, the platform does not claim exclusive rights, but it does retain the rights necessary to preserve the public page and audit trail.'
      ]
    },
    {
      title: '4. Version control and formal-version relationship',
      points: [
        'The platform maintains version control for submissions and revisions. V1 may appear as a discussion or incubation draft, with later V2/V3 revisions adding responses, evidence, and clarifications.',
        'If an academic-track submission later passes formal review and enters publication, the DOI points only to the final version of record; earlier discussion versions remain available as traceable history.',
        'When revising, withdrawing, correcting, or clarifying rights, authors should explain differences among versions so that no materially conflicting or misleading public record is created.'
      ]
    },
    {
      title: '5. DOI trigger mechanism and editorial workflow',
      points: [
        'A DOI is not assigned automatically. The author must request it after an academic-track submission reaches formal-publication quality, and the editorial office must complete review, production, and metadata verification before registration.',
        'Academic-track submissions may first appear publicly as discussion/incubation versions and move into a formal version only after adequate revision. The editorial office may require supplementary materials, further revision, or deny a DOI request.',
        'Creative/entertainment submissions generally do not receive a DOI and are not promised a formal scholarly-publication path, although they may still receive editorial recommendation, thematic placement, or archival display.'
      ]
    },
    {
      title: '6. Ethics, privacy, data, and platform boundaries',
      points: [
        'Submissions involving human participants, animals, sensitive data, restricted samples, or internal institutional materials should disclose ethics approval, consent context, and applicable restrictions.',
        'If data, code, or materials cannot be shared openly, the submission should explain the restriction, access conditions, or alternative verification arrangements; creative pieces involving fiction, parody, or AI-assisted generation should likewise avoid misleading presentation.',
        'The platform processes metadata, files, version records, workflow logs, and contact information to support editorial workflow, safety controls, public display, and compliance audit; it does not guarantee acceptance, review duration, citation performance, or third-party indexing.'
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
