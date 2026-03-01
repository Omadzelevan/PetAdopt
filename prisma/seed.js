import bcrypt from 'bcryptjs';
import { ListingType, PetStatus, Role } from '@prisma/client';
import { prisma } from '../server/src/lib/prisma.js';

async function main() {
  await prisma.message.deleteMany();
  await prisma.adoptionRequest.deleteMany();
  await prisma.savedPet.deleteMany();
  await prisma.report.deleteMany();
  await prisma.petPhoto.deleteMany();
  await prisma.pet.deleteMany();
  await prisma.organizationMember.deleteMany();
  await prisma.organization.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.emailToken.deleteMany();
  await prisma.pushSubscription.deleteMany();
  await prisma.donation.deleteMany();
  await prisma.user.deleteMany();

  const adminPassword = await bcrypt.hash(process.env.ADMIN_PASSWORD || 'Admin12345!', 12);
  const userPassword = await bcrypt.hash('User12345!', 12);

  const admin = await prisma.user.create({
    data: {
      name: 'PetAdopt Admin',
      email: process.env.ADMIN_EMAIL || 'admin@petadopt.local',
      passwordHash: adminPassword,
      role: Role.ADMIN,
      emailVerified: true,
    },
  });

  const user = await prisma.user.create({
    data: {
      name: 'Sofia Rescue',
      email: 'sofia@example.com',
      passwordHash: userPassword,
      role: Role.USER,
      emailVerified: true,
    },
  });

  const org = await prisma.organization.create({
    data: {
      name: 'Happy Paws Foundation',
      description: 'Community-led rescue and foster network.',
      location: 'Tbilisi',
      members: {
        create: {
          userId: admin.id,
          role: 'owner',
        },
      },
    },
  });

  const pets = [
    {
      name: 'Milo',
      species: 'Dog',
      breed: 'Golden Retriever',
      age: '2 years',
      ageGroup: 'young',
      gender: 'Male',
      size: 'Large',
      location: 'Tbilisi',
      health: 'Vaccinated, neutered, microchipped',
      description: 'Friendly family dog that loves social environments.',
      story: 'Rescued during winter storm and recovered fully in foster care.',
      listingType: ListingType.ADOPTION,
      status: PetStatus.ACTIVE,
      featured: true,
      ownerId: admin.id,
      organizationId: org.id,
      photos: [
        'https://images.unsplash.com/photo-1552053831-71594a27632d?auto=format&fit=crop&w=1200&q=80',
      ],
    },
    {
      name: 'Luna',
      species: 'Cat',
      breed: 'British Shorthair',
      age: '1 year',
      ageGroup: 'young',
      gender: 'Female',
      size: 'Small',
      location: 'Batumi',
      health: 'Vaccinated, spayed, litter trained',
      description: 'Calm indoor cat, perfect for apartment life.',
      story: 'Owner surrender due to relocation.',
      listingType: ListingType.ADOPTION,
      status: PetStatus.ACTIVE,
      featured: true,
      ownerId: user.id,
      photos: [
        'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?auto=format&fit=crop&w=1200&q=80',
      ],
    },
    {
      name: 'Nova',
      species: 'Dog',
      breed: 'Border Collie Mix',
      age: '4 years',
      ageGroup: 'adult',
      gender: 'Female',
      size: 'Medium',
      location: 'Kutaisi',
      health: 'Vaccinated, active, no chronic conditions',
      description: 'Smart, energetic, and training-oriented.',
      story: 'Recovered after minor injury and now fully healthy.',
      listingType: ListingType.FOSTER,
      status: PetStatus.ACTIVE,
      featured: true,
      ownerId: admin.id,
      photos: [
        'https://images.unsplash.com/photo-1517849845537-4d257902454a?auto=format&fit=crop&w=1200&q=80',
      ],
    },
    {
      name: 'Shadow',
      species: 'Dog',
      breed: 'Mixed',
      age: '3 years',
      ageGroup: 'adult',
      gender: 'Male',
      size: 'Medium',
      location: 'Rustavi',
      latitude: 41.5495,
      longitude: 44.9932,
      health: 'Wearing blue collar, friendly but anxious',
      description: 'Missing since Saturday evening near central park.',
      story: 'Lost while walking with sitter, family is searching.',
      listingType: ListingType.LOST_FOUND,
      status: PetStatus.ACTIVE,
      featured: false,
      ownerId: user.id,
      photos: [
        'https://images.unsplash.com/photo-1548199973-03cce0bbc87b?auto=format&fit=crop&w=1200&q=80',
      ],
    },
  ];

  for (const pet of pets) {
    await prisma.pet.create({
      data: {
        ...pet,
        photos: {
          create: pet.photos.map((url, index) => ({
            url,
            position: index,
          })),
        },
      },
    });
  }

  console.log('Seed completed');
  console.log('Admin login:', process.env.ADMIN_EMAIL || 'admin@petadopt.local');
  console.log('Admin password:', process.env.ADMIN_PASSWORD || 'Admin12345!');
  console.log('User login: sofia@example.com / User12345!');
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
