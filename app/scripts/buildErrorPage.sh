PACKAGE_VERSION=$(cat package.json | grep '"version"' | head -1 | awk -F: '{ print $2 }' | sed 's/[",]//g' | tr -d ' ')
sed -i -e "s|<%= BASE_URL %>|\/v$PACKAGE_VERSION\/|g" ./dist/error-pages/404-notfound.html