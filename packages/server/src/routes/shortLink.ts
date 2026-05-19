import { Router } from 'express'
import { prisma } from '../lib/prisma'

export const shortLinkRouter = Router()

// GET /s/:code — public, no auth; 302 redirect to originalUrl
shortLinkRouter.get('/:code', async (req, res) => {
  const link = await prisma.shortLink.findUnique({ where: { code: req.params['code'] } })
  if (!link) {
    res.status(404).send('Not found')
    return
  }
  res.redirect(302, link.originalUrl)
})
