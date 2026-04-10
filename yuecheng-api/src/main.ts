import 'reflect-metadata'
import { ValidationPipe } from '@nestjs/common'
import { NestFactory } from '@nestjs/core'
import { AppModule } from './app.module'

function parsePort(value: string | undefined): number {
  if (value === undefined) {
    return 3000
  }

  const parsed = Number(value)
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return 3000
  }

  return parsed
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule)
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  )
  const port = parsePort(process.env.PORT)

  await app.listen(port)
}

void bootstrap()
