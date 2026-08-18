$tag = "patapuputapa/kurpakorn:resume-$(Get-Date -format "yyyyMMdd-HHmmss")"
echo $tag
docker build -t $tag .
docker push $tag