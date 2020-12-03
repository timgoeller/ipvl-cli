const { Command } = require('commander')
const FileLog = require('versioned-file-log')
const IPFSStorageProviderHTTP = require('vfl-storage-provider-ipfs-http')
const fs = require('fs-extra')
const chalk = require('chalk')

const log = console.log

cli()

function cli () {
  const program = new Command()
  program.version('0.0.1')
  program
    .command('publish <path> <version>')
    .description('publish a file or directory')
    .action((path, version) => {

    })

  program
    .command('update <path> <version>')
    .description('update a file or directory')
    .action((path, version) => {

    })
  program.parse(process.argv)
}
