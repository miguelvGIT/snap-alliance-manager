import ts from 'typescript';
import {readdirSync,readFileSync,mkdirSync,writeFileSync} from 'node:fs';
const values=new Map();
function walk(dir){for(const item of readdirSync(dir,{withFileTypes:true})){const file=dir+'/'+item.name;if(item.isDirectory())walk(file);else if(/\.(ts|tsx)$/.test(file)){const code=readFileSync(file,'utf8');const source=ts.createSourceFile(file,code,ts.ScriptTarget.Latest,true,file.endsWith('x')?ts.ScriptKind.TSX:ts.ScriptKind.TS);function visit(node){if(ts.isStringLiteral(node)||ts.isNoSubstitutionTemplateLiteral(node)||ts.isJsxText(node)){const value=node.text.replace(/\s+/g,' ').trim();if(value){if(!values.has(value))values.set(value,[]);values.get(value).push(file);}}ts.forEachChild(node,visit);}visit(source);}}}
for(const dir of ['src','worker','tests','e2e'])walk(dir);
mkdirSync('.wrangler',{recursive:true});
writeFileSync('.wrangler/ui-strings.json',JSON.stringify([...values].map(([text,files])=>({text,files:[...new Set(files)]})),null,2));
