# ipvl cli
You can use this command-line-interface to publish different versions of a folder to IPFS and store these versions to a hypercore feed.

A package.json with the fields name, description and author is required.

You can use an .ipvlignore file to ignore files (following the same rules, as .gitignore files). Otherwise ipvl will look for a .gitignore file and use that if one exists. If there is neither an .ipvlignore or .gitignore all data will be copied.

## commands
### ipvl publish \[options\] \<path\> \<version\>
This will create a .ipvl folder in your given path. All files not specified in a .ipvlignore or .gitignore file will be copied to .ipvl/data/\<version\> and published to IPFS. The version, together with metadata from package.json and the IPFS-CID will be written to the hypercore feed located at .ipvl/data/log.

You can use `--force` to overwrite an existing .ipvl folder.
### ipvl update \<path\> \<version\>
Use publish for your initial push to IPFS, and update for all further versions.

## feed
A feed entry will look like this:
```json
{
  "type":"update",
  "value":{
    "name":"my data name",
    "description":"my description",
    "author":"what people call me",
    "version":"0.0.1",
    "location": {
      "locationIdentifier":"an IPFS CID",
      "storageType":"ipfs"
      }
  }
}
```
