export type Credentials = {
  agora_uid: number;
  agora_app_id: string;
  agora_channel: string;
  agora_token: string;
};

export type Session = {
  _id: string;
  // @deprecated, use credentials instead
  stream_urls?: Credentials;
  credentials: Credentials;
};

export type ApiResponse<T> = {
  code: number;
  msg: string;
  data: T;
};

export type Voice = {
  accent: string;
  description: string;
  language: string;
  preview: string;
  voice_id: string;
  name: string;
};

export type Language = {
  lang_code: string;
  lang_name: string;
  url: string;
};

export type Avatar = {
  name: string;
  from: number;
  gender: string;
  url: string;
  avatar_id: string;
  voice_id: string;
  thumbnailUrl: string;
  available: boolean;
};

export type Knowledge = {
  _id: string;
  team_id: string;
  uid: number;
  user_type: number;
  from: number;
  name: string;
  prologue?: string;
  prompt?: string;
  docs?: Array<{
    name: string;
    url: string;
    size: number;
  }>;
  urls?: string[];
  create_time: number;
  update_time: number;
};

export type KnowledgeCreateRequest = {
  name?: string;
  prologue?: string;
  prompt?: string;
  docs?: Array<{
    name: string;
    url: string;
    size: number;
  }>;
  urls?: string[];
};

export type KnowledgeUpdateRequest = {
  id: string;
  name?: string;
  prologue?: string;
  prompt?: string;
  docs?: Array<{
    name: string;
    url: string;
    size: number;
  }>;
  urls?: string[];
};

export type KnowledgeListResponse = {
  knowledge_list: Knowledge[];
  total: number;
  page: number;
  size: number;
};

export type SessionOptions = {
  avatar_id: string;
  duration: number;
  knowledge_id?: string;
  voice_id?: string;
  voice_url?: string;
  language?: string;
  mode_type?: number;
  background_url?: string;
  voice_params?: Record<string, unknown>;
};

export class ApiService {
  private openapiHost: string;
  private openapiToken: string;

  constructor(openapiHost: string, openapiToken: string) {
    this.openapiHost = openapiHost;
    this.openapiToken = openapiToken;
  }

  private async fetchApi(endpoint: string, method: string, body?: object) {
    const response = await fetch(`${this.openapiHost}${endpoint}`, {
      method,
      headers: {
        Authorization: `Bearer ${this.openapiToken}`,
        'Content-Type': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    const responseBody = await response.json();
    
    // Log the full response for debugging
    console.log('API Response:', {
      endpoint,
      method,
      status: response.status,
      response: responseBody
    });
    
    if (responseBody.code != 1000) {
      const errorMsg = `API Error (${responseBody.code}): ${responseBody.msg}`;
      console.error(errorMsg);
      alert(errorMsg);
      throw new Error(errorMsg);
    }
    return responseBody.data;
  }

  public async createSession(data: SessionOptions): Promise<Session> {
    return this.fetchApi('/api/open/v4/liveAvatar/session/create', 'POST', data);
  }

  public async closeSession(id: string) {
    return this.fetchApi('/api/open/v4/liveAvatar/session/close', 'POST', {
      id,
    });
  }

  public async getLangList(): Promise<Language[]> {
    const data = await this.fetchApi('/api/open/v3/language/list', 'GET');
    return data?.lang_list;
  }

  public async getKnowledgeList(page: number = 1, size: number = 10, name?: string): Promise<KnowledgeListResponse> {
    let url = `/api/open/v4/knowledge/list?page=${page}&size=${size}`;
    if (name) {
      url += `&name=${encodeURIComponent(name)}`;
    }
    const response = await this.fetchApi(url, 'GET');
    
    // The API returns data directly as an array, not wrapped in knowledge_list
    return {
      knowledge_list: Array.isArray(response) ? response : [],
      total: Array.isArray(response) ? response.length : 0,
      page: page,
      size: size
    };
  }

  public async getKnowledgeDetail(id: string): Promise<Knowledge> {
    return this.fetchApi(`/api/open/v4/knowledge/detail?id=${id}`, 'GET');
  }

  public async createKnowledge(data: KnowledgeCreateRequest): Promise<Knowledge> {
    return this.fetchApi('/api/open/v4/knowledge/create', 'POST', data);
  }

  public async updateKnowledge(data: KnowledgeUpdateRequest): Promise<Knowledge> {
    return this.fetchApi('/api/open/v4/knowledge/update', 'POST', data);
  }

  public async deleteKnowledge(id: string): Promise<void> {
    return this.fetchApi('/api/open/v4/knowledge/delete', 'DELETE', { id });
  }

  public async getVoiceList(): Promise<Voice[]> {
    return this.fetchApi('/api/open/v3/voice/list?from=3', 'GET');
  }

  public async getAvatarList(): Promise<Avatar[]> {
    const data = await this.fetchApi(`/api/open/v4/liveAvatar/avatar/list?page=1&size=100`, 'GET');
    return data?.result;
  }
}
