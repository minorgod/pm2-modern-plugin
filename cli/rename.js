#!/usr/bin/env node
const readline = require('readline').createInterface({
    input: process.stdin,
    output: process.stdout
});
const shell = require('shelljs');

function parseArgs(argList) {
    const args = {};
    for (let i = 0; i < argList.length; i++) {
        if (argList[i].startsWith('--')) {
            args[argList[i].substring(2)] = argList[i + 1];
        }
    }
    return args;
}

const cmdArgs = parseArgs(process.argv);

const fs = require('fs');
const path = require('path');

const getFiles = (dir, ext) =>
  fs.readdirSync(dir).flatMap(item => {
      const itemPath = path.join(dir, item);
      const stat = fs.statSync(itemPath);
      return stat.isDirectory()
        ? getFiles(itemPath, ext)
        : path.extname(item) === `.${ext}`
          ? [ itemPath ]
          : [];
  });

function changeNameInFiles({ fileType, replacements, targetDirs }) {
    targetDirs
      .filter(fs.existsSync)
      .flatMap(dir => getFiles(dir, fileType))
      .forEach(file => {
          Object.entries(replacements).forEach(([ search, replace ]) => {
              shell.sed('-i', search, replace, file);
          });
      });
}



function main({slug, rootNamespace, pluginName, githubUserName}) {
    const originalNamespace = 'VendorNamespace';
    const originalPluginNamespace = 'PluginNamespace';
    const originalPluginName = 'PLUGIN_NAME';
    const slugPlaceholder = 'pm2-modern-plugin';
    const GithubUserNamePlaceholder = 'github-username';

    const replacements = {
        [slugPlaceholder]: slug,
        [originalNamespace]: rootNamespace,
        [originalPluginName]: pluginName,
        [originalPluginNamespace]: pluginName,
        [GithubUserNamePlaceholder]: githubUserName,
    };

    const targetDirs = ['classes', 'src', 'tests'];
    const targetFilenames = ['composer.json', 'package.json', 'README.md', ];

    ['php', 'js', 'json', 'md', 'txt', 'css'].forEach(fileType => {
        changeNameInFiles({fileType, replacements, targetDirs});
    });

    // Handle replacements in specific filenames
    targetFilenames.forEach(filename => {
        Object.entries(replacements).forEach(([placeholder, replacement]) => {
            shell.sed('-i', placeholder, replacement, filename);
        });
    });

    // Change filename for ${SlugPlaceholder}.php to ${slug}.php
    const slugFilename = `${slugPlaceholder}.php`;
    if (shell.test('-f', slugFilename)) {
        shell.mv(slugFilename, `${slug}.php`);
    } else {
        console.log(`Could not find ${slugFilename} to rename`);
    }

}

if (cmdArgs.slug && cmdArgs['root-namespace'] && cmdArgs['plugin-name'] && cmdArgs['github-username']) {
    main({
        slug: cmdArgs.slug,
        rootNamespace: cmdArgs['root-namespace'],
        pluginName: cmdArgs['plugin-name'],
        githubUserName: cmdArgs['github-username']
    });
    readline.close();
} else {
    readline.question(`What is your plugin's slug? `, slug => {
        slug = slug.replace(/\W/g, '').toLowerCase();
        readline.question(`Root Namespace `, rootNamespace => {
            readline.question(`Plugin name? `, pluginName => {
                readline.question(`Github username? `, githubUserName => {
                    main({slug, rootNamespace, pluginName, githubUserName});
                    readline.close();
                });
            });
        });
    });
}
