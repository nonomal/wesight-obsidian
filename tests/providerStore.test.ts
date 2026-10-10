import fs from 'fs';
import os from 'os';
import path from 'path';

import { ProviderStore } from '../src/storage/providerStore';
import { CIYUAN_API } from '../src/ciyuan/constants';

function createSecretStorage(initial: Record<string, string> = {}) {
  const values = new Map<string, string>(Object.entries(initial));
  return {
    getSecret: (id: string) => values.get(id) ?? null,
    setSecret: (id: string, value: string) => {
      values.set(id, value);
    },
  };
}

describe('ProviderStore', () => {
  let tempDir: string;
  let env: NodeJS.ProcessEnv;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'wesight-provider-'));
    env = { WESIGHT_HOME: tempDir };
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  test.each(['openlux', undefined])('upgrades the legacy provider identity %s without changing secrets or model metadata', providerKey => {
    const secrets = createSecretStorage({ 'wesight-provider-api-key-legacy-profile': 'unchanged-key' });
    const modelCatalog = [{ id: 'google/gemini-3.7-flash', name: 'My Flash', modelVendor: 'google', supportsImage: true }];
    const legacy = {
      id: 'legacy-profile', agentId: 'claude', providerKey, name: 'OpenLux', apiKey: '',
      baseUrl: 'https://api.openlux.ai/v1/', model: modelCatalog[0].id, defaultModel: modelCatalog[0].id,
      models: [modelCatalog[0].id, 'manual-model'], modelCatalog, wireApi: 'chat',
      isDefault: true, createdAt: 123, updatedAt: 456,
    };
    fs.writeFileSync(path.join(tempDir, 'providers.json'), JSON.stringify({ version: 1, profiles: [legacy] }));
    const store = new ProviderStore(secrets, env);
    const upgraded = store.find('claude', legacy.id);
    expect(upgraded).toMatchObject({
      ...legacy, providerKey: CIYUAN_API.key, name: CIYUAN_API.name, baseUrl: CIYUAN_API.baseUrl, apiKey: 'unchanged-key',
    });
    expect(store.find('claude', 'OpenLux')).toEqual(upgraded);
    expect(secrets.getSecret('wesight-provider-api-key-legacy-profile')).toBe('unchanged-key');
    const disk = fs.readFileSync(store.path, 'utf8');
    const persisted = JSON.parse(disk) as { profiles: unknown[] };
    expect(persisted.profiles[0]).toMatchObject({ ...upgraded, apiKey: '' });
    expect(disk).not.toContain('unchanged-key');
    expect(store.exportProfiles()[0]).toMatchObject({ name: CIYUAN_API.name, providerKey: CIYUAN_API.key, apiKey: '', apiKeyRedacted: true });
    expect(new ProviderStore(secrets, env).find('claude', legacy.id)).toEqual(upgraded);
    expect(fs.readFileSync(store.path, 'utf8')).toBe(disk);
  });

  test('imports old provider exports with the original key and retains a custom endpoint through later saves', () => {
    const store = new ProviderStore(createSecretStorage(), env);
    const [profile] = store.importProfiles([{
      id: 'legacy-import', agentId: 'claude', providerKey: 'openlux', name: 'OpenLux', apiKey: 'imported-key',
      baseUrl: 'https://custom.example/v1', defaultModel: 'vendor/full-model-id', models: ['vendor/full-model-id'],
    }]);
    expect(profile).toMatchObject({
      id: 'legacy-import', providerKey: CIYUAN_API.key, name: CIYUAN_API.name, baseUrl: 'https://custom.example/v1', apiKey: 'imported-key',
    });
    expect(store.save({ id: profile.id, agentId: 'claude', name: CIYUAN_API.name, defaultModel: profile.defaultModel, models: profile.models }))
      .toMatchObject({ baseUrl: 'https://custom.example/v1', apiKey: 'imported-key', providerKey: CIYUAN_API.key });
  });

  test('only changes the old default address for identified provider profiles', () => {
    const store = new ProviderStore(createSecretStorage(), env);
    const unrelated = store.save({ agentId: 'claude', providerKey: 'custom', name: 'Custom', baseUrl: 'https://api.openlux.ai/v1' });
    expect(store.find('claude', unrelated.id)).toMatchObject({ providerKey: 'custom', name: 'Custom', baseUrl: unrelated.baseUrl });
    const customPath = store.save({ agentId: 'claude', providerKey: 'openlux', name: 'OpenLux', baseUrl: 'https://api.openlux.ai/custom/v1' });
    expect(store.find('claude', customPath.id)).toMatchObject({ providerKey: CIYUAN_API.key, baseUrl: customPath.baseUrl });
  });

  test('preserves catalog metadata through disk, model switches, partial saves and redacted round trips', () => {
    const secrets = createSecretStorage();
    const store = new ProviderStore(secrets, env);
    const modelCatalog = [
      { id: 'google/gemini-2.5-pro', name: 'My Gemini', modelVendor: 'google', supportsImage: true },
      { id: 'gpt-4o', name: 'My GPT', modelVendor: 'openai' },
    ];
    const saved = store.save({ agentId: 'claude', name: '词元API', providerKey: 'ciyuan', apiKey: 'private-key',
      baseUrl: 'https://ciyuan.today/v1', models: modelCatalog.map(model => model.id), modelCatalog,
      defaultModel: modelCatalog[0].id });
    const disk = fs.readFileSync(store.path, 'utf8');
    expect(disk).not.toContain('private-key');
    expect(disk).toContain('My Gemini');
    const restored = new ProviderStore(secrets, env);
    expect(restored.find('claude')?.modelCatalog).toEqual(modelCatalog);
    const external = restored.list()[0];
    external.modelCatalog![0].name = 'Changed clone';
    expect(restored.list()[0].modelCatalog![0].name).toBe('My Gemini');
    expect(restored.setActiveModel(saved.id, 'gpt-4o').modelCatalog).toEqual(modelCatalog);
    expect(restored.save({ id: saved.id, agentId: 'claude', name: '词元API', models: saved.models, defaultModel: 'gpt-4o' }))
      .toMatchObject({ providerKey: 'ciyuan', modelCatalog });
    const exported = restored.exportProfiles();
    expect(JSON.stringify(exported)).not.toContain('private-key');
    expect(restored.importProfiles(exported)[0]).toMatchObject({ providerKey: 'ciyuan', modelCatalog, defaultModel: 'gpt-4o', apiKey: '' });
  });

  test('makes the first profile default for an agent', () => {
    const store = new ProviderStore(createSecretStorage(), env);
    const profile = store.save({
      agentId: 'codex',
      name: 'openai',
      apiKey: 'sk-test',
      model: 'gpt-5.4',
    });
    expect(profile.isDefault).toBe(true);
    expect(store.find('codex')?.id).toBe(profile.id);
  });

  test('redacts secrets during export', () => {
    const store = new ProviderStore(createSecretStorage(), env);
    store.save({
      agentId: 'claude',
      name: 'anthropic',
      apiKey: 'sk-secret-value',
    });
    expect(store.exportProfiles()[0]).toMatchObject({
      apiKey: '',
      apiKeyRedacted: true,
    });
    expect(store.exportProfiles({ includeSecrets: true })[0].apiKey).toBe('sk-secret-value');
    expect(fs.readFileSync(path.join(tempDir, 'providers.json'), 'utf8'))
      .not.toContain('sk-secret-value');
  });

  test('migrates legacy plaintext API keys into SecretStorage', () => {
    const secrets = createSecretStorage();
    fs.writeFileSync(path.join(tempDir, 'providers.json'), JSON.stringify({
      version: 1,
      profiles: [{
        id: 'legacy-profile',
        agentId: 'codex',
        name: 'legacy',
        apiKey: 'sk-legacy-secret',
        baseUrl: 'https://api.example.com/v1',
        model: 'example-model',
        defaultModel: 'example-model',
        models: ['example-model'],
        wireApi: 'chat',
        isDefault: true,
        createdAt: 1,
        updatedAt: 1,
      }],
    }));

    const store = new ProviderStore(secrets, env);
    expect(store.find('codex')?.apiKey).toBe('sk-legacy-secret');
    expect(secrets.getSecret('wesight-provider-api-key-legacy-profile')).toBe('sk-legacy-secret');
    expect(fs.readFileSync(path.join(tempDir, 'providers.json'), 'utf8'))
      .not.toContain('sk-legacy-secret');
  });

  test('migrates API keys from the legacy SecretStorage id', () => {
    const secrets = createSecretStorage({
      'wesight-provider-api-key:legacy-profile': 'sk-legacy-secret',
    });
    fs.writeFileSync(path.join(tempDir, 'providers.json'), JSON.stringify({
      version: 1,
      profiles: [{
        id: 'legacy-profile',
        agentId: 'claude',
        name: 'Moonshot',
        apiKey: '',
        baseUrl: 'https://api.moonshot.cn/anthropic',
        model: 'kimi-k3',
        defaultModel: 'kimi-k3',
        models: ['kimi-k3'],
        wireApi: 'chat',
        isDefault: true,
        createdAt: 1,
        updatedAt: 1,
      }],
    }));

    const store = new ProviderStore(secrets, env);
    const profile = store.find('claude');
    expect(profile?.apiKey).toBe('sk-legacy-secret');
    expect(profile?.anthropicAuthMode).toBe('authToken');
    expect(secrets.getSecret('wesight-provider-api-key-legacy-profile')).toBe('sk-legacy-secret');
  });

  test('infers official Anthropic API key authentication for old profiles', () => {
    const store = new ProviderStore(createSecretStorage(), env);
    const profile = store.save({
      agentId: 'claude',
      name: 'Claude',
      apiKey: 'sk-test',
      baseUrl: 'https://api.anthropic.com',
      defaultModel: 'claude-sonnet-4-6',
    });
    expect(profile.anthropicAuthMode).toBe('apiKey');
  });

  test('validates imported provider profiles before saving', () => {
    const store = new ProviderStore(createSecretStorage(), env);
    expect(() => store.importProfiles([{ agentId: 'unknown', name: 'invalid' }]))
      .toThrow('invalid agentId');
    expect(store.list()).toEqual([]);
  });

  test('keeps one default per agent', () => {
    const store = new ProviderStore(createSecretStorage(), env);
    const first = store.save({ agentId: 'opencode', name: 'first' });
    const second = store.save({ agentId: 'opencode', name: 'second', isDefault: true });
    expect(store.find('opencode')?.id).toBe(second.id);
    expect(store.list('opencode').find(profile => profile.id === first.id)?.isDefault).toBe(false);
  });

  test('normalizes profile models and wire API defaults', () => {
    const store = new ProviderStore(createSecretStorage(), env);
    const profile = store.save({
      agentId: 'codex',
      name: 'deepseek',
      apiKey: 'sk-test',
      baseUrl: 'https://api.deepseek.com/v1',
      model: 'deepseek-chat',
    });
    expect(profile.defaultModel).toBe('deepseek-chat');
    expect(profile.models).toEqual(['deepseek-chat']);
    expect(profile.wireApi).toBe('chat');
  });

  test('uses responses wire API for the official OpenAI endpoint', () => {
    const store = new ProviderStore(createSecretStorage(), env);
    const profile = store.save({
      agentId: 'codex',
      name: 'openai',
      baseUrl: 'https://api.openai.com/v1',
      defaultModel: 'gpt-5.4',
    });
    expect(profile.wireApi).toBe('responses');
  });
});
