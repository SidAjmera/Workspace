import {createOpenAI} from '@ai-sdk/openai';
import {createAnthropic} from '@ai-sdk/anthropic';
import {createGoogleGenerativeAI} from '@ai-sdk/google';
import {createCohere} from '@ai-sdk/cohere';
import {createOpenAICompatible} from '@ai-sdk/openai-compatible';
import {safeCustomFetch,validateEndpoint} from './safe-endpoint';
export const providers=[
{id:'openai',name:'OpenAI',model:'',base:'https://api.openai.com/v1'},
{id:'google',name:'Google Gemini',model:'',base:'https://generativelanguage.googleapis.com/v1beta'},
{id:'anthropic',name:'Anthropic Claude',model:'',base:'https://api.anthropic.com/v1'},
{id:'groq',name:'Groq',model:'',base:'https://api.groq.com/openai/v1'},
{id:'openrouter',name:'OpenRouter',model:'',base:'https://openrouter.ai/api/toolnest/v1'},
{id:'deepseek',name:'DeepSeek',model:'',base:'https://api.deepseek.com/v1'},
{id:'mistral',name:'Mistral',model:'',base:'https://api.mistral.ai/v1'},
{id:'together',name:'Together AI',model:'',base:'https://api.together.xyz/v1'},
{id:'fireworks',name:'Fireworks AI',model:'',base:'https://api.fireworks.ai/inference/v1'},
{id:'cohere',name:'Cohere',model:'',base:'https://api.cohere.com/v2'},
{id:'perplexity',name:'Perplexity',model:'',base:'https://api.perplexity.ai'},
{id:'custom',name:'Custom compatible API',model:'',base:''},
];
export type Connection={provider:string;apiKey:string;model:string;endpoint?:string};
export async function languageModel(c:Connection){
 const p=providers.find(p=>p.id===c.provider);if(!p)throw new Error('Unsupported provider.');
 if(c.provider==='openai')return createOpenAI({apiKey:c.apiKey}).chat(c.model);
 if(c.provider==='anthropic')return createAnthropic({apiKey:c.apiKey})(c.model);
 if(c.provider==='google')return createGoogleGenerativeAI({apiKey:c.apiKey})(c.model);
 if(c.provider==='cohere')return createCohere({apiKey:c.apiKey})(c.model);
 if(c.provider==='custom')await validateEndpoint(c.endpoint||'');
 return createOpenAICompatible({name:p.id,apiKey:c.apiKey,baseURL:c.provider==='custom'?c.endpoint!:p.base,fetch:c.provider==='custom'?safeCustomFetch:undefined})(c.model);
}
export function providerError(e:unknown){const status=(e as {statusCode?:number})?.statusCode;return status===401||status===403?'The provider rejected this API key.':status===402?'Insufficient provider credits.':status===429?'Provider rate limit or usage quota exceeded.':status===404?'Unsupported model or endpoint.':'The provider could not complete the request. Check your model, credits, and connection.';}
