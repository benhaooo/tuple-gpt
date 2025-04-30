const old_models = {
    openai: [
        'gpt-3.5-turbo',
        'gpt-4',
        'gpt-4o',
        'gpt-4o-mini',
        'o1-preview',
        'o1-mini',
        'o1-mini-all',
        'o1-preview-all',
        'o1-pro-all',
    ],
    azure: [
        'gpt-3.5-turbo',
        'gpt-4',
        'gpt-4o',
        'gpt-4o-mini',
        'o1-preview',
        'o1-mini',
    ],
    claude: [
        'claude-3-sonnet-20240229',
        'claude-3-opus-20240229',
        'claude-3-5-sonnet-20240620',
        'claude-3-5-sonnet-20241022',
        'claude-3-7-sonnet-20250219'
    ],
    gemini: [
        'gemini-pro',
        'gemini-pro-1.5',
        'gemini-1.5-pro-exp-0801'
    ],
    kimi: [
        'moonshot-v1-auto',
    ],
    deepseek: [
        'deepseek-chat',
        'deepseek-reasoner'
    ],
    siliconflow: [
        'deepseek-ai/DeepSeek-V3',
        'deepseek-ai/DeepSeek-R1',
        'Qwen/Qwen2.5-72B-Instruct'
    ],
    doubao: [
        'DeepSeek-R1',
        'DeepSeek-V3',
        'DeepSeek-R1-Distill-Qwen-32B',
        'Doubao-1.5-pro-32k',
    ],
    local: [
        'deepseek-r1:8b',
    ]
};


interface Model {
    name: string;       // 模型名称
    power: number[];    // 模型的能力值
    status: boolean;    // 模型的状态（启用/禁用）
}

interface Group {
    name: string;       // 分组名称
    icon: string;       // 分组的图标链接
    models: Model[];    // 分组下的模型列表
}

export interface Service {
    provider: string;       // 服务提供商名称
    logo: string;           // 服务提供商的图标链接
    api_key: string;        // 服务的 API 密钥
    api_url: string;        // 服务的 API 地址
    api_version?: string;   // 服务的 API 版本（可选）
    status: boolean;        // 服务的状态（启用/禁用）
    groups: Group[];        // 分组列表（数组形式）
}

const modelServiceVersion = '1.0.0';
const modelService = <Service[]>[
    {
        provider: '月之暗面',
        logo: 'https://favicon.im/platform.moonshot.cn',
        api_key: '',
        api_url: 'https://api.moonshot.cn',
        status: false,
        groups: [
            {
                name: 'kimi',
                icon: 'https://favicon.im/kimi.moonshot.cn',
                models: [
                    {
                        name: 'moonshot-v1-auto',
                        power: [],
                        status: true,
                    }
                ]
            }
        ]
    },
    {
        provider: '硅基流动',
        logo: 'https://favicon.im/account.siliconflow.cn',
        api_key: '',
        api_url: 'https://api.siliconflow.cn',
        status: false,
        groups: [
            {
                name: 'deepseek',
                icon: 'https://favicon.im/chat.deepseek.com',
                models: [
                    {
                        name: 'deepseek-ai/DeepSeek-R1',
                        power: [0, 0, 1],
                        status: true,
                    },
                    {
                        name: 'deepseek-ai/DeepSeek-V3',
                        power: [],
                        status: true,
                    },
                ]
            },
            {
                name: 'Qwen',
                icon: 'https://favicon.im/tongyi.aliyun.com',
                models: [
                    {
                        name: 'Qwen/Qwen2.5-72B-Instruct',
                        power: [],
                        status: true,
                    },
                    {
                        name: 'Qwen/Qwen2.5-7B-Instruct',
                        power: [],
                        status: true,
                    }
                ]
            }
        ]
    },
    {
        provider: 'Azure',
        logo: 'https://favicon.im/portal.azure.com',
        api_key: '',
        api_url: '',
        api_version: '',
        status: false,
        groups: [
            {
                name: 'chatgpt',
                icon: 'https://favicon.im/openai.com',
                models: [
                    {
                        name: 'gpt-4o',
                        power: [1],
                    }
                ]
            }
        ]
    },
    {
        provider: '火山引擎',
        logo: 'https://favicon.im/www.volcengine.com',
        api_key: '',
        api_url: 'https://ark.cn-beijing.volces.com',
        url_suffix: 'api/v3/chat/completions',
        status: false,
        groups: [
            {
                name: 'doubao',
                icon: 'https://favicon.im/www.doubao.com',
                models: [
                    {
                        name: 'doubao-1-5-pro-32k-250115',
                        power: [],
                        status: true,
                    }
                ]
            },
            {
                name: 'doubao',
                icon: 'https://favicon.im/www.doubao.com',
                models: [
                    {
                        name: 'doubao-1-5-pro-256k-250115',
                        power: [],
                        status: true,
                    }
                ]
            },
            {
                name: 'deepseek',
                icon: 'https://favicon.im/chat.deepseek.com',
                models: [
                    {
                        name: 'deepseek-v3-241226',
                        power: [],
                        status: true,
                    },
                    {
                        name: 'deepseek-r1-250120',
                        power: [0, 0, 1],
                        status: true,
                    },
                ]
            }
        ]
    },
    {
        provider: 'OpenAI-HK',
        logo: 'https://favicon.im/www.openai-hk.com',
        api_key: '',
        api_url: 'https://api.openai-hk.com',
        status: false,
        groups: [
            {
                name: 'chatgpt',
                icon: 'https://favicon.im/openai.com',
                models: [
                    {
                        name: 'o1-preview-2024-09-12',
                        power: [0, 0, 1],
                        status: true,
                    },
                    {
                        name: 'o1-mini-2024-09-12',
                        power: [0, 0, 1],
                        status: true,
                    },
                    {
                        name: 'chatgpt-4o-latest',
                        power: [1],
                        status: true,
                    },
                    {
                        name: 'gpt-4.5-preview-2025-02-27',
                        power: [],
                        status: true,
                    },
                    // {
                    //     name:
                    // }
                ]
            },
            {
                name: 'claude',
                icon: 'https://favicon.im/www.anthropic.com',
                models: [
                    {
                        name: 'claude-3-7-sonnet-20250219',
                        power: [0, 0, 1],
                        status: true,
                    },
                    {
                        name: 'claude-3-5-sonnet-20241022',
                        power: [],
                        status: true,
                    },
                    {
                        name: 'claude-3-5-sonnet-20240620',
                        power: [],
                        status: true,
                    },
                ]
            },
            {
                name: 'grok',
                icon: '',
                models: [
                    {
                        name: 'grok-3',
                        power: [0],
                        status: true,
                    },
                    {
                        name: 'grok-3-reasoner',
                        power: [],
                        status: true,
                    },
                    {
                        name: 'grok-3-deepsearch',
                        power: [],
                        status: true,
                    },
                ]
            }
        ]
    },
    {
        provider: '深度求索',
        logo: 'https://favicon.im/chat.deepseek.com',
        api_key: '',
        api_url: 'https://api.deepseek.com',
        status: false,
        groups: [
            {
                name: 'deepseek',
                icon: 'https://favicon.im/chat.deepseek.com',
                models: [
                    {
                        name: 'deepseek-chat',
                        power: [],
                        status: true,
                    },
                    {
                        name: 'deepseek-reasoner',
                        power: [0, 0, 1],
                        status: true,
                    },
                ]
            }
        ]
    },
    {
        provider: '扣子',
        logo: '',
        api_key: '',
        api_url: 'https://api.coze.cn/v3/chat',
        status: false,
        groups: [
            {
                name: '智能体',
                icon: '',
                models: [
                    {
                        name: '7483801538981478409',
                        power: [],
                        status: true,
                    },
                ]
            }
        ]
    }
];


function mergeServiceConfigurations(
    localServices: Service[],
    remoteServices: Service[]
): Service[] {
    const localServiceMap = new Map<string, Service>();

    localServices.forEach(service => {
        localServiceMap.set(service.provider, service);
    });

    // 合并远程服务配置到本地
    return remoteServices.map(remoteService => {
        const localService = localServiceMap.get(remoteService.provider);

        // 如果本地没有这个服务，直接使用远程配置
        if (!localService) {
            return { ...remoteService };
        }

        // 保留用户可配置的数据
        const mergedService: Service = {
            ...remoteService,                // 基础数据使用远程的最新配置
            api_key: localService.api_key,   // 保留用户的 API 密钥
            api_url: localService.api_url,   // 保留用户的 API URL
            status: localService.status,     // 保留用户的状态设置
        };

        // 如果 api_version 存在于本地配置中，则保留
        if (localService.api_version !== undefined) {
            mergedService.api_version = localService.api_version;
        }

        // 合并组和模型，保留模型状态
        mergedService.groups = mergeGroups(localService.groups, remoteService.groups);

        return mergedService;
    });
}


function mergeGroups(localGroups: Group[], remoteGroups: Group[]): Group[] {
    // 将本地组映射到一个对象，以便于查找
    const localGroupMap = new Map<string, Group>();
    localGroups.forEach(group => {
        localGroupMap.set(group.name, group);
    });

    return remoteGroups.map(remoteGroup => {
        const localGroup = localGroupMap.get(remoteGroup.name);

        // 如果本地没有这个组，直接使用远程配置
        if (!localGroup) {
            return { ...remoteGroup };
        }

        // 合并组配置，保留远程的图标和名称，但合并模型
        return {
            ...remoteGroup,
            models: mergeModels(localGroup.models, remoteGroup.models)
        };
    });
}

function mergeModels(localModels: Model[], remoteModels: Model[]): Model[] {
    // 将本地模型映射到一个对象，以便于查找
    const localModelMap = new Map<string, Model>();
    localModels.forEach(model => {
        localModelMap.set(model.name, model);
    });

    return remoteModels.map(remoteModel => {
        const localModel = localModelMap.get(remoteModel.name);

        // 如果本地没有这个模型，直接使用远程配置
        if (!localModel) {
            return { ...remoteModel };
        }

        // 保留用户设置的模型状态
        return {
            ...remoteModel,
            status: localModel.status  // 保留用户的模型状态设置
        };
    });
}

export { old_models as models, modelService, mergeServiceConfigurations };
