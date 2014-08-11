'use strict';

var Q = require('q');
var pathUtil = require('path');
var childProcess = require('child_process');
var DecompressZip = require('decompress-zip');
var utils = require('./utils');

// Detects archive type just by examining file extension.
var detectType = function (filePath) {
    if (/\.zip$/.test(filePath)) {
        return 'zip';
    }
    if (/\.tar\.gz$/.test(filePath)) {
        return 'tar';
    }
    return 'unknown';
}

var untar = function(archivePath, destPath) {
    var deferred = Q.defer();
    
    if (utils.os() === 'linux') {
        // On linux use super fast untar provided by the system.
        var command = "tar -zxf " + archivePath + " --strip-components=1 -C " + destPath;
        childProcess.exec(command, function (error, stdout, stderr) {
            if (error || stderr) {
                console.log('ERROR while unpacking tar:');
                console.log(error);
                console.log(stderr);
                deferred.reject();
            } else {
                deferred.resolve();
            }
        });
    } else {
        throw "TAR decompression supported only on linux.";
    }

    return deferred.promise;
};

var unzip = function(archivePath, destPath) {
    var deferred = Q.defer();
    
    new DecompressZip(archivePath)
    .on('error', function (err) {
        console.log('ERROR while unpacking zip:');
        console.log(err);
        deferred.reject();
    })
    .on('extract', deferred.resolve)
    .extract({
        path: destPath,
        strip: 1
    });

    return deferred.promise;
}

module.exports = function (archivePath, destPath) {
    var type = detectType(archivePath);
    var unpack = {
        'zip': unzip,
        'tar': untar,
        'unknown': function () {
            throw "Unknown file format. Can't extract.";
        }
    };
    return unpack[type](archivePath, destPath);
};
