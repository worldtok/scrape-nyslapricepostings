import { Page } from 'puppeteer'
import puppeteer from 'puppeteer-extra'
import stealth from 'puppeteer-extra-plugin-stealth'
import { parse } from 'json2csv'

import * as dotenv from 'dotenv'
dotenv.config()

import fs from 'fs'

import { Price } from './models/price.js'
import { delay, slug, timestamp } from './helpers.js'
import path from 'path'

puppeteer.use(stealth())

let tries: number = 0
let totalPageCount: number | null = null
let currentPage: number | null = null
let typesObj: { id: string; name: string }[] = []

let responseFetched = false

let typeDistributors: {
  serial_number: number
  premise_name: string
  county: string
}[] = []

export const scrape = async (): Promise<any> => {
  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: { width: 1600, height: 860 },
    args: ['--disable-web-security', '--disable-features=IsolateOrigins,site-per-process']
  })
  const url = 'https://www.nyslapricepostings.com/price/lookup'
  // https://www.nyslapricepostings.com/rest/organization/get-published-distributors/LR?month=current_month
  const distributorUrl = 'https://www.nyslapricepostings.com/rest/organization/get-published-distributors'

  const page = await browser.newPage()
  page.setDefaultNavigationTimeout(0)

  const uas = [
    'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/104.0.5112.81 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/110.0'

    // add more useragents as you want and one will always be randomly selected
    // 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.0.0 Safari/537.36',
    // 'Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.0.0 Mobile Safari/537.36'
  ]
  const UA = uas[Math.floor(Math.random() * uas.length)]
  showMes('user-agent', UA)

  await page.setUserAgent(UA)
  await page.setExtraHTTPHeaders({ 'Accept-Language': 'en' })

  saveDate(page)

  try {
    await page.goto(url, { waitUntil: 'networkidle0' })
  } catch {
    tries = tries + 1
    if (tries > 10) {
      console.log(`ERROR: unable to navigate to ${url}`)
      process.exit()
    }
    return scrape()
  }

  try {
    await page.waitForSelector('select')
  } catch {
    showMes('error', 'Unable to find the select type element')
    process.exit()
  }

  typesObj = await page.evaluate(() => {
    let items: { id: string; name: string }[] = []
    document
      .querySelector('select')
      ?.querySelectorAll('option')
      .forEach(o => items.push({ id: o.value, name: o.textContent?.trim()! }))
    return items.filter(x => x && x.id.trim())
  })

  const types = typesObj.map(t => t.id)

  // console.log(types)
  const processType = async (index: number = 0): Promise<any> => {
    if (index >= types.length) return
    let type = types[index]
    if (!type) return processType(index + 1)

    let _url = `${distributorUrl}/${type}?month=current_month`

    // Fetch all distributors for this type
    const distributors: {
      serial_number: number
      premise_name: string
      county: string
    }[] = await page.evaluate(async url => {
      let data: any = await fetch(url)
      data = data.json()
      return data
    }, _url)

    typeDistributors = distributors

    const processDistributor = async (dIndex: number = 0, pIndex: number = 1): Promise<any> => {
      if (dIndex >= distributors.length) return
      let distributor = distributors[dIndex]
      if (!distributor) return processDistributor(dIndex + 1)

      // https://www.nyslapricepostings.com/price/lookup?post_type=LR&serial_number=3163244&page=1
      const endpoint = new URL(url)
      endpoint.searchParams.set('post_type', type)
      endpoint.searchParams.set('serial_number', String(distributor.serial_number))
      endpoint.searchParams.set('page', String(pIndex))

      let _exist = await Price.exists({ type: type, distributor_serial: distributor.serial_number, page: pIndex })

      if (_exist) {
        showMes('EXIST', `${endpoint.href} already scraped`)
        return processDistributor(dIndex + 1)
      }

      showMes('process', `Moved to ${endpoint.href}`)

      try {
        await page.goto(endpoint.href)
      } catch {
        showMes('error', `Unable to goto to ${endpoint.href}`)
      }

      await delay(5000)

      if (!responseFetched) {
        // clear total pages
        totalPageCount = null
      }
      let seconds = 5

      const waitForTable = async (): Promise<any> => {
        try {
          if (totalPageCount) return
          console.log('Still waiting for table')
          await page.waitForSelector('.table-responsive table', { timeout: seconds > 30 ? 1000 * 30 : 5000 })
        } catch {
          showMes('waiting for table', `Waited ${seconds} seconds for table to show`)
          seconds += 30
          return waitForTable()
        }
      }

      await waitForTable()

      showMes('table found', 'Table has shown')

      await totalPages()
      responseFetched = false
      showMes('done', endpoint.href)

      let nextPage = currentPage! + 1
      console.log({ currentPage, totalPageCount, nextPage: nextPage < currentPage! ? nextPage : null })

      if (currentPage !== totalPageCount && nextPage > currentPage!) {
        showMes('process', `    Moved to page ${nextPage}`)
        return processDistributor(dIndex, nextPage)
      }

      // now table is available
      // saveDate has processed its response
      // move to next item
      // process.exit()

      return processDistributor(dIndex + 1)
    }

    await processDistributor()
  }

  await processType()
}

const saveDate = async (page: Page) => {
  page.on('response', async response => {
    let _url = response.url()
    // https://www.nyslapricepostings.com/rest/product/lookup?post_type=LR&serial_number=2205172

    if (_url.includes('/rest/product/lookup')) {
      showMes('Fetch-status', response.status())

      if (response.status() > 399) return

      let serialNumber = new URL(_url).searchParams.get('serial_number')

      let _type = new URL(_url).searchParams.get('post_type')!

      let type = typesObj.find(x => x.id == _type)?.name || ''

      const dis = typeDistributors.find(x => x.serial_number == Number(serialNumber))!

      // console.log(type, typesObj)

      console.log(`Fetched data for : ${_url}`)

      let item = await response.json()

      responseFetched = true
      totalPageCount = item.pageInfo.pagesCount
      currentPage = item.pageInfo.page

      let items: any[] = item.data

      items = items.map(x => {
        //      {
        //     "type": "%",
        //     "unit": "C",
        //     "amount": 10,
        //     "quantity": 10
        // }
        // amount type on quantity unit
        let discount_str = x.discount_values.map((d: any) => `${d.amount}${d.type} on ${d.quantity}${d.unit}`).join('|')
        return {
          brand_reg: x.brand_reg,
          brand_name: x.brand_name,
          type: x.post_type,
          selected_type: type,

          item: x.prod_name,
          size: x.item_size, //in ml
          discounts: x.discount_values,
          discount_formatted: discount_str,

          per_bottle: x.bot_price,
          per_case: x.case_price,
          bot_per_case: x.botpercase,

          item_id: x.id,

          distributor_serial: dis.serial_number || 0,
          distributor_name: dis.premise_name || '',
          distributor_county: dis.county || '',

          page: currentPage
        }
      })
      // console.log(items)

      await Price.insertMany(items)

      showMes('Saved data to database', `From ${_url}`)
    }
  })
}

const totalPages = async (): Promise<number> => {
  if (totalPageCount) return totalPageCount

  const done = async (): Promise<any> => {
    console.log('check', { totalPageCount })

    if (totalPageCount) return true
    await delay(500)
    return done()
  }
  await done()
  console.log({ totalPageCount })
  return totalPageCount!
}

const showMes = (type: string, mes: string | number | null = null, end: boolean = false) => {
  console.log(`${type.toUpperCase()}: ${mes}`)
  if (end) process.exit()
}

export const csv = async () => {
  let data = await Price.find({})

  let folder = process.env.CSV_FOLDER || 'CSVS'
  folder = slug(folder)

  folder = path.join(__dirname, './../' + folder)

  !fs.existsSync(folder) && fs.mkdirSync(folder, { recursive: true })

  let name = `export-${slug(timestamp())}.csv`

  let fileName = folder + path.sep + name

  const fields: string[] = [
    'brand_reg',
    'brand_name',
    'type',
    'selected_type',
    'item',
    'size',
    'discounts',
    'discount_formatted',

    'per_bottle',
    'per_case',
    'bot_per_case',
    'item_id',
    'distributor_serial',
    'distributor_name',
    'distributor_county',
    'page'
  ]

  try {
    const csv = parse(data, { fields })

    fs.writeFileSync(fileName, csv)
    showMes('saved', 'csv saved inside ' + fileName)
    showMes('filename', name)
  } catch (e) {
    showMes('error', 'unable to export the expected csv, please try again')
    console.log(e)
  }

  process.exit()
}
