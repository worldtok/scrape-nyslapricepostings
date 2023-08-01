# nyslapricepostings scrapper

You will need to have node and mongodb installed on your system

## softwares to install

1. To install node visit [Node Js](https://nodejs.org/en/download)

2. To install mongodb visit [Mongo db](https://www.mongodb.com/try/download/community)

Mongodb is mainly used to save all scrapped data

while installing mongodb ensure that you select the option to install the mongodb compass as this is the application yu will use to easily visualize all the data scrapped easily

If you have installed all the softwares above

then run the commands below

run the command below

### command-0

```bat
npm install
```

The above command install all the project dependencies necessary to build and run the application

### command-1

```bat
npm i -g typescript
```

The above command install typescript which is used to bundle the raw code to executable javascript files

### command-2

```bat
npm run tsc
```

The above command will build the typescript files to an executable javascript files and save the files inside [/server/](./server/)

### check package.json for details of commands to run

## CONFIGURATIONS

Open [.env](./.env) file and update the database name and csv folder

## UTILIZING COMMANDS

### scrapping the data

```bat
npm run scrape
```

This command will open up a browser, try to scrape from the first selected element from the select element available on the page,
if captcha is encountered, it will wait for the captcha to be resolved manually

so ensure that you are close to your system as you will often need to verify the captcha so that the bot will keep running until everything is scrapped

### exporting csv

```bat
npm run csv
```

This will export all that that have been scrapped and save it inside the folder you provided in the [.env file](./.env) file

If you have installed the mongodb with its compass, you can easily access mongodb form the mongodb compass and view all the data there
You can also easily export data as csv or json from mongodb compass

## YOUR ARE DONE

### check [package.json](package.json)

For more understanding of all scripts and how and when to run them

### commands

```bat

1. npm run tsc

2. npm run scrape

3. npm run csv
```
