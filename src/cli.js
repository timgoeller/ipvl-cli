#!/usr/bin/env node
const { Command } = require('commander')
const FileLog = require('versioned-file-log')
const IPFSStorageProviderHTTP = require('vfl-storage-provider-ipfs-http')
const fse = require('fs-extra')
const chalk = require('chalk')
const console = require('console')
const path = require('path')
const parseIgnore = require('parse-gitignore')
const gitignore = require('parse-gitignore')
const glob = require('glob')

const log = console.log

cli()

function cli () {
  const program = new Command()
  program.version('0.0.1')
  program
    .command('publish <path> <version>')
    .description('publish a project')
    .option('-f, --force', 'overwrite existing project')
    .action((path, version, cmdObj) => publish(path, version, cmdObj.force))

  program
    .command('update <path> <version>')
    .description('update a project')
    .action((path, version) => update(path, version))
  program.parse(process.argv)
}

async function publish (projectPath, version, force = false) {
  const pathExists = await fse.pathExists(projectPath)

  if (!pathExists) {
    console.error(chalk.redBright('The folder you want to publish doesn\'t seem to exist.'))
    process.exit(1)
  }

  const pathIsDirectory = fse.statSync(projectPath).isDirectory()
  if (!pathIsDirectory) {
    console.error(chalk.redBright('You can only publish folders. What you gave me looks like a file.'))
    process.exit(1)
  }

  const paths = getStandardFolderPaths(projectPath, version)

  const ipvlFolderExists = await fse.pathExists(paths.ipvl)

  if (ipvlFolderExists && !force) {
    console.error(chalk.redBright('The folder you gave me is already published. You probably want to use the update command instead.'))
    console.error(chalk.redBright('However if you disagree, you can use --force to overwrite the existing log.'))
    process.exit(1)
  }

  try {
    await fse.emptyDir(paths.ipvl)
    await fse.emptyDir(paths.ipvlLog)
    await fse.emptyDir(paths.ipvlData)
  } catch (err) {
    console.error(chalk.redBright('Something went wrong while creating the ipvl directory.'))
    console.error(err)
  }

  await releaseVersion(version, paths)
}

async function update (projectPath, version) {
  const paths = getStandardFolderPaths(projectPath, version)

  const pathExists = await fse.pathExists(projectPath)

  if (!pathExists) {
    console.error(chalk.redBright('The folder you want to publish doesn\'t seem to exist.'))
    process.exit(1)
  }

  const ipvlFolderExists = await fse.pathExists(paths.ipvl)

  if (!ipvlFolderExists) {
    console.error(chalk.redBright('I wasn\'t able to find a log here. Try using the publish command instead.'))
    process.exit(1)
  }

  releaseVersion(version, paths)
}

async function releaseVersion (version, paths) {
  try {
    await fse.emptyDir(paths.ipvlVersionData)
  } catch (err) {
    console.error(chalk.redBright('Something went wrong while creating the data directory for this version.'))
    console.error(err)
  }
  const ipvlIgnoreExists = await fse.pathExists(paths.ipvlIgnore)
  const gitIgnoreExists = await fse.pathExists(paths.gitIgnore)
  let ignore = []
  if (ipvlIgnoreExists) {
    ignore = await fse.readFile(paths.ipvlIgnore).then(buffer => parseIgnore(buffer))
  } else if (gitIgnoreExists) {
    ignore = await fse.readFile(paths.gitIgnore).then(buffer => parseIgnore(buffer))
  }

  function applyGlob (pattern) {
    return new Promise((resolve, reject) => {
      glob(pattern, function (err, files) {
        if (err) reject(err)
        resolve(files)
      })
    })
  }

  const filesToIgnore = await Promise.all(ignore.map(pattern => applyGlob(pattern)))
  filesToIgnore.push(paths.ipvl)
  const filesToIgnoreFlatResolved = filesToIgnore.flat().map((file) => path.resolve(file))

  const pathsToCopy = await applyGlob(paths.project + '/*')

  async function copyVersionData (from, to) {
    if (filesToIgnoreFlatResolved.includes(path.resolve(from))) return

    to = path.join(to, path.basename(from))

    const filterFunc = (src, dest) => {
      // your logic here
      // it will be copied if return true
      if (filesToIgnoreFlatResolved.includes(path.resolve(src))) {
        return false
      }
      return true
    }

    return fse.copy(from, to, { filter: filterFunc }, err => {
      if (err) throw err
    })
  }

  await Promise.all(pathsToCopy.map(pathToCopy => copyVersionData(pathToCopy, paths.ipvlVersionData)))

  let packageJson
  try {
    packageJson = await fse.readJson(path.join(paths.project, 'package.json'))
  } catch (err) {
    console.error(err)
  }

  const ipfsStorage = new IPFSStorageProviderHTTP()
  const fileLog = new FileLog(ipfsStorage, paths.ipvlVersionData, paths.ipvlLog)
  await fileLog.update({
    name: packageJson.name,
    description: packageJson.description,
    author: packageJson.author,
    version
  })
  log(chalk.greenBright(`Version ${version} successfully published to IPFS!`))
  log()
  log(chalk.greenBright('Public key: ' + chalk.underline(fileLog.feed.key.toString('hex'))))
  log()
  log(chalk.greenBright('Secret key: ' + chalk.underline(fileLog.feed.secretKey.toString('hex'))) + chalk.redBright(' (Psst, keep secret!)'))
  log()
  log(chalk.greenBright('Discovery key: ' + chalk.underline(fileLog.feed.discoveryKey.toString('hex'))))
}

function getStandardFolderPaths (projectPath, version) {
  return {
    project: projectPath,
    ipvl: path.join(projectPath, '/.ipvl'),
    ipvlLog: path.join(projectPath, '/.ipvl/log'),
    ipvlData: path.join(projectPath, '/.ipvl/data'),
    ipvlVersionData: path.join(projectPath, '/.ipvl/data', version),
    ipvlIgnore: path.join(projectPath, '/.ipvlignore'),
    gitIgnore: path.join(projectPath, '/.gitignore')
  }
}
