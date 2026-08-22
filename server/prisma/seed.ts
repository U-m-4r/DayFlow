/** Creates local-only demo accounts, all pre-verified so the app is usable immediately. */
import dotenv from 'dotenv';
import path from 'path';
dotenv.config({path:path.resolve(__dirname,'../.env')});
import { PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcrypt';
const prisma = new PrismaClient();
async function main() {
  const passwordHash = await bcrypt.hash('Welcome@123', 12);
  const people = [{employeeId:'DF-0001',email:'admin@dayflow.local',role:Role.ADMIN,name:'Avery Morgan'}, ...['Mina Shah','Noah Chen','Iris Patel','Leo Martin'].map((name,i)=>({employeeId:`DF-000${i+2}`,email:`employee${i+1}@dayflow.local`,role:Role.EMPLOYEE,name}))];
  await Promise.all(people.map((person)=>prisma.user.upsert({ where:{email:person.email}, update:{}, create:{ employeeId:person.employeeId,email:person.email,passwordHash,role:person.role,isEmailVerified:true,profile:{create:{fullName:person.name,department:person.role===Role.ADMIN?'People Operations':'Product',designation:person.role===Role.ADMIN?'HR Officer':'Employee',dateOfJoining:new Date('2024-01-15')}}}})));
}
main().catch((error)=>{console.error(error);process.exitCode=1;}).finally(()=>prisma.$disconnect());
