import { resolve } from 'node:path'
import { writeFile } from 'node:fs/promises'
import puppeteer, { type Page } from 'npm:puppeteer@23.10.4'
import * as _ from 'jsr:@psych/lib@1.18.0'
import { exportSheet, type ExportTypes } from 'jsr:@psych/sheet@1.0.6'

type Score = {
  '学年学期': string
  '课程/环节': string
  '学分': string
  '实得学分': string
  '类别': string
  '课程性质': string
  '考核方式': string
  '修读性质': string
  '综合成绩': string
  '辅修标记': string
  '备注': string
}

type Stat = {
  '学年学期': string
  '总学分': number
  '总学分积': number
  '加权平均成绩': number
}

/**
 * 获取入学以来的所有学业成绩
 * @param options 设置
 * @param options.username 学号
 * @param options.password 数字京师密码
 * @param options.rawHtmlDist 原始 html 文件路径 (默认为 raw.html)
 * @param options.scoresDist 分数信息文件路径 (默认为 scores)
 * @param options.statDist 统计信息文件路径 (默认为 stat)
 * @param options.scoresFormat 分数信息文件格式 (默认为 json)
 * @param options.statFormat 统计信息文件格式 (默认为 json)
 * @param options.showBrowser 是否显示浏览器 (默认为 false)
 * @param options.parseHtmlOnly 用于调试, 传入 html 字符串, 跳过登录过程, 只获取分数和统计信息 (默认为 undefined)
 */
export default async function parser({
  username,
  password,
  rawHtmlDist = resolve(import.meta.dirname!, 'raw.html'),
  scoresDist = resolve(import.meta.dirname!, 'scores'),
  statDist = resolve(import.meta.dirname!, 'stat'),
  scoresFormat = 'json',
  statFormat = 'json',
  showBrowser = false,
  parseHtmlOnly,
}: {
  username: string
  password: string
  rawHtmlDist?: string
  scoresDist?: string
  statDist?: string
  scoresFormat?: ExportTypes
  statFormat?: ExportTypes
  showBrowser?: boolean
  parseHtmlOnly?: string 
}): Promise<void> {
  if (!scoresDist.endsWith(`.${scoresFormat}`)) {
    scoresDist += `.${scoresFormat}`
  }
  if (!statDist.endsWith(`.${statFormat}`)) {
    statDist += `.${statFormat}`
  }
  const browser = await puppeteer.launch({
    headless: !showBrowser,
    acceptInsecureCerts: true,
    
  })
  const page = await browser.newPage()
  if (typeof parseHtmlOnly !== 'string') {
    // 跳转到登录页面
    await page.goto(
      'https://cas.bnu.edu.cn/cas/login?service=http%3A%2F%2Fzyfw.bnu.edu.cn%2F',
    )
    // 等待加载
    await page.waitForNetworkIdle()
    // 输入学号
    await page.type('#un', username)
    // 输入密码
    await page.type('#pd', password)
    // 点击登录按钮
    await page.click('#index_login_btn')
    // 等待加载
    await page.waitForNetworkIdle()
    // 如果有, 点击 "继续访问原地址"
    if (
      await page.$(
        'body > div > div.mid_container > div > div > div > div.select_login_box > div:nth-child(6) > a',
      )
    ) {
      await page.click(
        'body > div > div.mid_container > div > div > div > div.select_login_box > div:nth-child(6) > a',
      )
    }
    // 等待加载
    await page.waitForNetworkIdle()
    // 点击 "学业成绩"
    await page.click('li[data-code="JW1314"]')
    // 等待加载
    await page.waitForNetworkIdle()
    // 获取 iframe
    const frame1 = page.frames().find((frame) =>
      frame.url().includes('/frame/jw/teacherstudentmenu.jsp?menucode=JW1314')
    )
    // 获取子 iframe
    const frame2 = frame1!.childFrames()[0]
    // 点击 "入学以来"
    await frame2!.click('#sjxz1')
    // 点击 "有效成绩"
    await frame2!.click('#yxcj')
    // 点击 "检索"
    await frame2!.click('#btnQry')
    // 等待加载
    await page.waitForNetworkIdle()
    // 获取子 iframe
    const frame3 = frame2!.childFrames()[0]
    // 获取 html
    const html = (await frame3!.content()).replace('charset=GBK', 'charset=utf-8')
    // 保存 html
    await writeFile(rawHtmlDist, html)
    // 设置 html
    await page.setContent(html)
  } else {
    // 设置 html
    await page.setContent(parseHtmlOnly)
  }
  // 获取分数信息
  const scores = await getScores(page)
  // 保存分数信息
  await writeFile(scoresDist, exportSheet(scores, scoresFormat))
  // 计算统计信息
  const stat = getStat(scores)
  // 保存统计信息
  await writeFile(statDist, exportSheet(stat, statFormat))
  // 关闭浏览器
  await browser.close()
  return
}

function getStat(scores: Score[]): Stat[] {
  const result: Stat[] = []
  // 总和
  const totalCredits = _.sum(scores
    .filter((score) => !isNaN(parseFloat(score['学分'])))
    .map((score) => parseFloat(score['学分']))
  )
  const totalCreditsSum = _.sum(scores
    .filter((score) => !isNaN(parseFloat(score['学分'])) && !isNaN(parseFloat(score['综合成绩'])))
    .map((score) => parseFloat(score['学分']) * parseFloat(score['综合成绩']))
  )
  result.push({
    '学年学期': '入学以来',
    '总学分': totalCredits,
    '总学分积': totalCreditsSum,
    '加权平均成绩': totalCreditsSum / totalCredits,
  })
  // 分学期
  const semesters = Array.from(new Set(scores.map((score) => score['学年学期'])))
  for (const s of semesters) {
    const data = scores.filter((score) => score['学年学期'] === s)
    const credits = _.sum(data
      .filter((score) => !isNaN(parseFloat(score['学分'])))
      .map((score) => parseFloat(score['学分']))
    )
    const creditsSum = _.sum(data
      .filter((score) => !isNaN(parseFloat(score['学分'])) && !isNaN(parseFloat(score['综合成绩'])))
      .map((score) => parseFloat(score['学分']) * parseFloat(score['综合成绩']))
    )
    result.push({
      '学年学期': s,
      '总学分': credits,
      '总学分积': creditsSum,
      '加权平均成绩': creditsSum / credits,
    })
  }
  return result
}

async function getScores(page: Page): Promise<Score[]> {
  const scores = await page.evaluate(() => {
    const scores: Record<string, string>[] = []
    document.querySelectorAll('table').forEach((table) => {
      if (table.querySelector('thead > tr > td')?.textContent?.includes('学年学期')) {
        const heads = Array.from(table.querySelectorAll('thead > tr > td')).map((head) => head.textContent!)
        const trs = Array.from(table.querySelectorAll('tbody > tr'))
        for (let i = 0; i < trs.length; i++) {
          const tds = Array.from(trs[i].querySelectorAll('td'))
          const score: Record<string, string> = {}
          for (let j = 0; j < heads.length; j++) {
            if (tds[j].textContent) {
              score[heads[j]] = tds[j].textContent!.trim()
            } else if (heads[j] === '学年学期' && scores.length && scores[scores.length - 1][heads[j]]) {
              score[heads[j]] = scores[scores.length - 1][heads[j]]
            } else {
              score[heads[j]] = ''
            }
          }
          scores.push(score)
        }
      }
    })
    return scores
  })
  return scores as Score[]
} 
