// 替换为你的密钥、终结点和区域
const apiKey = '923feb6bdf5347699bf9d9b780b26d76';
const endpoint = 'https://meiguodongbu.openai.azure.com';
const apiVersion = 'v1'; // 根据你的 API 版本
const deploymentId = '0125-preview'; // 部署的模型 ID

// 配置请求头
const headers = {
  'Content-Type': 'application/json',
  'api-key': apiKey
};

// 构建请求体
const data = {
  prompt: 'Hello, how are you?',
  max_tokens: 50
};

// 发送 POST 请求
fetch(`${endpoint}/openai/deployments/${deploymentId}/completions?api-version=${apiVersion}`, {
  method: 'POST',
  headers: headers,
  body: JSON.stringify(data)
})
  .then(response => {
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response.json();
  })
  .then(data => {
    console.log('Response:', data);
  })
  .catch(error => {
    console.error('Error:', error);
  });