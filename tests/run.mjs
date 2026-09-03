import ts from 'typescript';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
await mkdir('.test-build',{recursive:true});
for (const [source,target] of [['lib/game.ts','game.mjs'],['app/api/turn/route.ts','route.mjs']]) {
 const text=(await readFile(source,'utf8')).replaceAll("@/lib/game",'./game.mjs');
 const result=ts.transpileModule(text,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}});
 await writeFile('.test-build/'+target,result.outputText);
}
const result=spawnSync(process.execPath,['--test','tests/game.test.mjs','tests/narrator.test.mjs'],{stdio:'inherit'});
process.exit(result.status??1);
