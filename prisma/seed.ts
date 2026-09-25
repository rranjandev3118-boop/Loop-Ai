import { PrismaClient, Role, Sentiment, FeedbackStatus, Prisma } from "@prisma/client";
import bcrypt from "bcryptjs";
import { createEmbedding } from "../lib/embeddings";
const db=new PrismaClient();
const topics=[
["Onboarding","Setup, invitations and first-run experience"],["Performance","Speed, reliability and responsiveness"],
["Billing","Invoices, payments and billing workflows"],["Mobile","Mobile experience and responsive UI"],
["SSO & Security","Enterprise authentication and security"],["Reporting","Exports, analytics and reports"],
["Search","Finding information quickly"],["Integrations","Connecting external tools and workflows"]
];
const snippets=[
["Onboarding","Onboarding took too long and I could not invite my team.","Support ticket", "Acme"],
["Performance","The dashboard loads much faster now. Great improvement.","App store","Beta"],
["Billing","The invoice download keeps timing out.","Support ticket","Northstar"],
["Mobile","The mobile experience needs work on smaller screens.","NPS survey","Orbit"],
["SSO & Security","We need SSO before our procurement team can sign.","Sales call note","Vertex"],
["Reporting","The export saved me hours this week.","Community post","Pioneer"],
["Search","I still struggle to find older customer conversations.","Support ticket","Acme"],
["Integrations","Please add an integration with our help desk.","NPS survey","Northstar"]
];
async function main(){
 const password = await bcrypt.hash("LoopDemo123!", 12);
 const w=await db.workspace.upsert({where:{id:"demo-workspace"},update:{},create:{id:"demo-workspace",name:"LOOP Demo Workspace"}});
 for(const [email,name,role] of [["admin@loop.demo","Demo Admin",Role.ADMIN],["analyst@loop.demo","Demo Analyst",Role.ANALYST],["viewer@loop.demo","Demo Viewer",Role.VIEWER]]){
  await db.user.upsert({where:{email},update:{workspaceId:w.id,role:role as Role,passwordHash:password,emailVerified:new Date()},create:{email,name,passwordHash:password,emailVerified:new Date(),role:role as Role,workspaceId:w.id}});
  const seededUser = await db.user.findUniqueOrThrow({where:{email}});
  await db.workspaceMember.upsert({where:{workspaceId_userId:{workspaceId:w.id,userId:seededUser.id}},update:{role:role as Role,status:"ACTIVE"},create:{workspaceId:w.id,userId:seededUser.id,role:role as Role,status:"ACTIVE"}});
 }
 const themeMap=new Map<string,string>();
 for(const [name,description] of topics){const t=await db.theme.upsert({where:{id:`demo-${name}`},update:{name,description},create:{id:`demo-${name}`,name,description,workspaceId:w.id,color:"indigo"}});themeMap.set(name,t.id);}
 await db.feedback.deleteMany({where:{workspaceId:w.id}});
 for(let i=0;i<128;i++){
  const s=snippets[i%snippets.length], sentiment=i%5===0?Sentiment.NEG:i%3===0?Sentiment.NEU:Sentiment.POS;
  const created=new Date(Date.now()-((i*17)%60)*86400000);
  const f=await db.feedback.create({data:{content:s[1]+` (Example ${i+1})`,channel:s[2],customerLabel:s[3],sentiment,sentimentScore:sentiment===Sentiment.NEG?-0.65:sentiment===Sentiment.POS?0.72:0.05,status:i%4===0?FeedbackStatus.ACTIONED:i%3===0?FeedbackStatus.REVIEWED:FeedbackStatus.NEW,featureArea:s[0],rationale:"Seeded demo classification",workspaceId:w.id,createdAt:created}});
  const tid=themeMap.get(s[0]); if(tid)await db.feedbackTheme.create({data:{feedbackId:f.id,themeId:tid,confidence:.92}});
  const vector = createEmbedding(f.content);
  await db.embedding.create({data:{feedbackId:f.id,vector}});
  await db.$executeRaw(Prisma.sql`UPDATE "Embedding" SET "vectorPg" = ${`[${vector.join(",")}]`}::vector WHERE "feedbackId" = ${f.id}`);
 }
 const admin = await db.user.findFirstOrThrow({where:{email:"admin@loop.demo"}});
 await db.report.deleteMany({where:{workspaceId:w.id,title:"Weekly Voice of Customer — Demo"}});
 await db.report.create({data:{title:"Weekly Voice of Customer — Demo",periodStart:new Date(Date.now()-7*86400000),periodEnd:new Date(),workspaceId:w.id,generatedBy:admin.id,contentJson:{topThemes:["Onboarding","Performance","Billing"],sentimentShift:"Demo report generated from seeded feedback.",quotes:["Onboarding took too long and I could not invite my team.","The dashboard loads much faster now."],recommendedActions:["Review onboarding invitation flow","Monitor billing download reliability"]}}});
 await db.questionHistory.deleteMany({where:{workspaceId:w.id}});
 await db.questionHistory.create({data:{workspaceId:w.id,userId:admin.id,question:"What are customers saying about onboarding?",answer:"Seeded demo evidence points to delayed invitations and a slower first-run setup.",citations:snippets.filter((snippet)=>snippet[0]==="Onboarding").map((snippet)=>({quote:snippet[1]}))}});
}
main().finally(()=>db.$disconnect());
