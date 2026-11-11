import { access, mkdir, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, dirname, extname, resolve } from "node:path";
import { spawn } from "node:child_process";

type Options = { input: string; output: string; aspect: "9:16" | "16:9" | "1:1"; height: 720 | 1080 | 1440 | 2160; };
function parseArgs(args: string[]): Options {
  const values = new Map<string,string>();
  for (let i=0;i<args.length;i++) {
    const key=args[i];
    if (key.startsWith("--")) {
      const value=args[i+1];
      if (!value || value.startsWith("--")) throw new Error("Informe um valor para "+key);
      values.set(key.slice(2),value); i++;
    }
  }
  const input=values.get("input"), output=values.get("output");
  if (!input || !output) throw new Error("Uso: npm start -- --input ./bruto.mp4 --output ./final.mp4 [--aspect 9:16|16:9|1:1] [--height 720|1080|1440|2160]");
  const aspect=(values.get("aspect") ?? "9:16") as Options["aspect"];
  const height=Number(values.get("height") ?? "1080") as Options["height"];
  if (!["9:16","16:9","1:1"].includes(aspect)) throw new Error("Proporção inválida.");
  if (![720,1080,1440,2160].includes(height)) throw new Error("Resolução inválida.");
  return { input:resolve(input), output:resolve(output), aspect, height };
}
function run(command:string,args:string[]):Promise<string>{
  return new Promise((resolvePromise,reject)=>{
    const child=spawn(command,args,{stdio:["ignore","pipe","pipe"]});
    let stdout="",stderr="";
    child.stdout.setEncoding("utf8").on("data",chunk=>stdout+=chunk);
    child.stderr.setEncoding("utf8").on("data",chunk=>stderr+=chunk);
    child.on("error",reject);
    child.on("close",code=>code===0?resolvePromise(stdout):reject(new Error(stderr.slice(-5000)||command+" falhou ("+code+")")));
  });
}
async function main(){
  const options=parseArgs(process.argv.slice(2));
  await access(options.input);
  if (options.input===options.output) throw new Error("O arquivo de saída não pode sobrescrever o original.");
  await mkdir(dirname(options.output),{recursive:true});
  const temp=await mkdtemp(resolve(tmpdir(),"09-video-ai-"));
  try {
    const probe=JSON.parse(await run("ffprobe",["-v","error","-show_format","-show_streams","-of","json",options.input])) as {
      format?:{duration?:string;format_name?:string}; streams?:Array<{codec_type?:string;width?:number;height?:number;codec_name?:string}>;
    };
    const video=probe.streams?.find(stream=>stream.codec_type==="video");
    if(!video) throw new Error("O arquivo não contém uma faixa de vídeo.");
    const audio=probe.streams?.some(stream=>stream.codec_type==="audio");
    const [w,h]=options.aspect==="9:16"?[9,16]:options.aspect==="16:9"?[16,9]:[1,1];
    const width=Math.round(options.height*w/h/2)*2;
    const scaleCrop=`scale=${width}:${options.height}:force_original_aspect_ratio=increase,crop=${width}:${options.height},setsar=1`;
    const filters=audio?`${scaleCrop},fps=30`:`${scaleCrop},fps=30`;
    const outputTemp=resolve(temp,"render.mp4");
    const args=["-hide_banner","-y","-i",options.input,"-map","0:v:0"];
    if(audio) args.push("-map","0:a:0?");
    args.push("-vf",filters,"-c:v","libx264","-preset","medium","-crf","20","-pix_fmt","yuv420p");
    if(audio) args.push("-af","loudnorm=I=-16:TP=-1.5:LRA=11","-c:a","aac","-b:a","192k");
    args.push("-movflags","+faststart","-shortest",outputTemp);
    await run("ffmpeg",args);
    await run("ffmpeg",["-v","error","-i",outputTemp,"-f","null","-"]);
    const { copyFile }=await import("node:fs/promises");
    await copyFile(outputTemp,options.output);
    console.log(JSON.stringify({ok:true,input:basename(options.input),output:options.output,duration_seconds:Number(probe.format?.duration??0),source:{format:probe.format?.format_name??null,width:video.width??null,height:video.height??null,video_codec:video.codec_name??null,audio},render:{aspect:options.aspect,width,height,video_codec:"h264",audio_normalized:audio}},null,2));
  } finally { await rm(temp,{recursive:true,force:true}); }
}
main().catch(error=>{console.error("[09 VIDEO AI]",error instanceof Error?error.message:error);process.exitCode=1;});
