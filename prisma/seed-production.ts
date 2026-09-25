import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting production seed...');

  // Create default workspace
  const workspace = await prisma.workspace.upsert({
    where: { slug: 'default' },
    update: {},
    create: {
      name: 'Default Workspace',
      slug: 'default',
      timezone: 'UTC',
      settings: {
        features: {
          classification: true,
          reports: true,
          aiInsights: true
        }
      }
    }
  });

  console.log(`✅ Workspace created: ${workspace.name}`);

  // Create admin user (change password in production!)
  const adminPassword = await bcrypt.hash('ChangeMe123!', 12);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@loop.demo' },
    update: {},
    create: {
      name: 'System Administrator',
      email: 'admin@loop.demo',
      passwordHash: adminPassword,
      role: 'ADMIN',
      workspaceId: workspace.id,
      emailVerified: new Date()
    }
  });

  // Create workspace membership
  await prisma.workspaceMember.upsert({
    where: {
      workspaceId_userId: {
        workspaceId: workspace.id,
        userId: admin.id
      }
    },
    update: {},
    create: {
      workspaceId: workspace.id,
      userId: admin.id,
      role: 'ADMIN',
      status: 'ACTIVE'
    }
  });

  console.log(`✅ Admin user created: ${admin.email}`);

  // Create sample themes
  const themes = await Promise.all([
    prisma.theme.upsert({
      where: { id: 'theme-1' },
      update: {},
      create: {
        id: 'theme-1',
        name: 'User Experience',
        description: 'Feedback related to user interface and experience',
        color: '#3B82F6',
        workspaceId: workspace.id
      }
    }),
    prisma.theme.upsert({
      where: { id: 'theme-2' },
      update: {},
      create: {
        id: 'theme-2',
        name: 'Performance',
        description: 'Feedback about system performance and speed',
        color: '#10B981',
        workspaceId: workspace.id
      }
    }),
    prisma.theme.upsert({
      where: { id: 'theme-3' },
      update: {},
      create: {
        id: 'theme-3',
        name: 'Feature Requests',
        description: 'Suggestions for new features and improvements',
        color: '#F59E0B',
        workspaceId: workspace.id
      }
    })
  ]);

  console.log(`✅ Created ${themes.length} sample themes`);

  // Create sample feedback
  const sampleFeedback = [
    {
      content: 'The dashboard loads very slowly when I have multiple reports open',
      channel: 'Support ticket',
      customerLabel: 'Enterprise Customer',
      sentiment: 'NEG' as const
    },
    {
      content: 'Love the new dark mode! It makes working late much easier on my eyes.',
      channel: 'In-app feedback',
      customerLabel: 'Premium User',
      sentiment: 'POS' as const
    },
    {
      content: 'Would be great to have export to Excel for the analytics reports',
      channel: 'Feature request',
      customerLabel: 'Business Analyst',
      sentiment: 'NEU' as const
    },
    {
      content: 'The mobile app crashes when I try to upload large files',
      channel: 'Support ticket',
      customerLabel: 'Mobile User',
      sentiment: 'NEG' as const
    },
    {
      content: 'The AI classification is surprisingly accurate for our use case',
      channel: 'In-app feedback',
      customerLabel: 'Data Scientist',
      sentiment: 'POS' as const
    }
  ];

  for (const feedback of sampleFeedback) {
    await prisma.feedback.create({
      data: {
        ...feedback,
        workspaceId: workspace.id,
        status: 'NEW',
        classificationStatus: 'CLASSIFIED'
      }
    });
  }

  console.log(`✅ Created ${sampleFeedback.length} sample feedback items`);

  // Create initial notification
  await prisma.notification.create({
    data: {
      workspaceId: workspace.id,
      userId: admin.id,
      type: 'WELCOME',
      title: 'Welcome to LOOP',
      body: 'Your workspace is ready! Start by adding team members or importing feedback.',
      eventKey: `welcome-${Date.now()}`
    }
  });

  console.log('✅ Created welcome notification');

  console.log('\n🎉 Production seed completed successfully!');
  console.log('\n⚠️  IMPORTANT SECURITY NOTES:');
  console.log('1. Change the default admin password immediately');
  console.log('2. Update admin email to your actual email');
  console.log('3. Remove or disable sample data in production');
  console.log('4. Review and update workspace settings');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });