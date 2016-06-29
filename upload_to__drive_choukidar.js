// variables section
var fs = require('fs');
var readline = require('readline');
var google = require('googleapis');
var googleAuth = require('google-auth-library');
var chokidar = require('chokidar');
var log = console.log.bind(console);
var oauth2Client;
var SCOPES = ['https://www.googleapis.com/auth/drive','https://www.googleapis.com/auth/drive','https://www.googleapis.com/auth/drive'];
var TOKEN_PATH ='drive-nodejs-quickstart.json';

var watcher = chokidar.watch('./documents/', {ignored: /[\/\\]\./, persistent: true,ignoreInitial: true});

try
{
   var content= fs.readFileSync('client_secret.json');
    if(content===null || content===undefined || content.length===0)
        throw  new  Error('file not found');
    else
        authorize(JSON.parse(content));
}
catch (err)
{
 console.log(err.message);
    return;
}


function authorize(credentials) {
    var clientSecret = credentials.installed.client_secret;
    var clientId = credentials.installed.client_id;
    var redirectUrl = credentials.installed.redirect_uris[0];
    var auth = new googleAuth();
    oauth2Client = new auth.OAuth2(clientId, clientSecret, redirectUrl);

    // Check if we have previously stored a token.
    try {
        var token=fs.readFileSync(TOKEN_PATH);
        oauth2Client.credentials = JSON.parse(token);


    }
  catch(err)
  {
      console.log('getting new token');
      getNewToken(oauth2Client);


  }

}
watcher
    .on('add',function (path) {
        
        log('File', path, 'has been added');
        var file_name=path.slice(10);
        var file_extension=path.split('.')[1];
        createfiles(oauth2Client,file_name,file_extension)
        
    })
    .on('change', function (path) {
        log('File', path, 'has been changed');
    })
    .on('unlink', function (path) 
    {
        log('File', path, 'has been deleted');
        var file_name=path.slice(10);
        var file_extension=path.split('.')[1];
        deletefile(oauth2Client,file_name,file_extension);

    })
.on('error',function (error) {
    log('Watcher error: ${error}')});

function getNewToken(oauth2Client) {
    var authUrl = oauth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: SCOPES
    });
    console.log('Authorize this app by visiting this url: ', authUrl);
    var rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });
    rl.question('Enter the code from that page here: ', function(code) {
        rl.close();
        oauth2Client.getToken(code, function(err, token) {
            if (err) {
                console.log('Error while trying to retrieve access token', err);
                return;
            }
            oauth2Client.credentials = token;
            storeToken(token);
        });
    });
}

function storeToken(token) {
    fs.writeFile(TOKEN_PATH, JSON.stringify(token));
    console.log('Token stored to ' + TOKEN_PATH);
}

function createfiles(auth,file_name,file_extension) {
    var drive = google.drive({ version: 'v3', auth: auth });
    var mimeType;
    if(file_extension==='doc')
        mimeType='application/msword';
    else if(file_extension==='docx')
        mimeType='application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    else if(file_extension==='pdf')
        mimeType='application/pdf';
    drive.files.create({
        auth: auth,resource: {
            name: file_name,
            mimeType: mimeType
        },
        media: {
            mimeType: mimeType,
            body: fs.createReadStream('./documents/'+file_name)// this is my local pdf that i have uploaded
        }
    }, function(err, response) {
        if (err) {
            console.log('The API returned an error: ' + err);
            return;
        }
        else
        {
            console.log(response);
        }
    });
}



function deletefile(auth,file_name,file_extension) {
    var mimeType;
    if(file_extension==='doc')
        mimeType='application/msword';
    else if(file_extension==='docx')
        mimeType='application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    else if(file_extension==='pdf')
        mimeType='application/pdf';
    var drive = google.drive({ version: 'v3', auth: auth });
    file_name=file_name;
    drive.files.list({
        auth: auth,
        q:"name contains \'"+file_name+"\'"+"and mimeType=\'"+mimeType+"\'"
    

    }, function(err, response) {
        var files_list='';
        var file_id='';
        var file_name='';
        if (err) {
            console.log('The API returned an error: ' + err);
            return;
        }
        else
        {
            files_list=response.files;
            if(files_list.length==0)
            {
                console.log('file is not found on drive');
            }
            else
            {
                file_id=files_list[0].id;
                file_name=files_list[0].name;
               // console.log(response);
                console.log(file_id);
                drive.files.delete({auth:auth,fileId:file_id},function (err,res) {
                    if (err) {
                        console.log('The API returned an error in deleting the file: ' + err);
                        return;
                    }

                    else
                    {
                        console.log('file '+ file_name+' has been deleted from drive');
                    }

                })

            }
        }
    });
}