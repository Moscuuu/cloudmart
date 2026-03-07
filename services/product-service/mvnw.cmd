@REM ----------------------------------------------------------------------------
@REM Licensed to the Apache Software Foundation (ASF) under one
@REM or more contributor license agreements.  See the NOTICE file
@REM distributed with this work for additional information
@REM regarding copyright ownership.  The ASF licenses this file
@REM to you under the Apache License, Version 2.0 (the
@REM "License"); you may not use this file except in compliance
@REM with the License.  You may obtain a copy of the License at
@REM
@REM    http://www.apache.org/licenses/LICENSE-2.0
@REM
@REM Unless required by applicable law or agreed to in writing,
@REM software distributed under the License is distributed on an
@REM "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
@REM KIND, either express or implied.  See the License for the
@REM specific language governing permissions and limitations
@REM under the License.
@REM ----------------------------------------------------------------------------

@REM ----------------------------------------------------------------------------
@REM Apache Maven Wrapper startup batch script, version 3.3.2
@REM
@REM Required ENV vars:
@REM   JAVA_HOME - location of a JDK home dir
@REM
@REM Optional ENV vars:
@REM   MVNW_REPOURL - repo url base for downloading maven distribution
@REM   MVNW_USERNAME/MVNW_PASSWORD - user and password for downloading maven
@REM   MVNW_VERBOSE - true: enable verbose log
@REM ----------------------------------------------------------------------------

@REM Begin all assignments locally
@setlocal

@set "MAVEN_PROJECTBASEDIR=%~dp0"

@REM Find java.exe
@set "JAVA_EXE=java.exe"
@if defined JAVA_HOME (
  @set "JAVA_EXE=%JAVA_HOME%\bin\java.exe"
  @if not exist "%JAVA_EXE%" (
    @echo ERROR: JAVA_HOME is set to an invalid directory: %JAVA_HOME% 1>&2
    @echo Please set the JAVA_HOME variable in your environment to match the location of your Java installation. 1>&2
    @goto error
  )
)

@set "MAVEN_HOME=%USERPROFILE%\.m2\wrapper\dists\apache-maven-3.9.9"
@set "MVN_CMD=%MAVEN_HOME%\bin\mvn.cmd"

@if exist "%MVN_CMD%" goto runMaven

@REM Download Maven
@set "DOWNLOAD_URL=https://repo.maven.apache.org/maven2/org/apache/maven/apache-maven/3.9.9/apache-maven-3.9.9-bin.zip"
@set "WRAPPER_PROPERTIES=%MAVEN_PROJECTBASEDIR%.mvn\wrapper\maven-wrapper.properties"

@if exist "%WRAPPER_PROPERTIES%" (
  @for /f "usebackq tokens=1,2 delims==" %%a in ("%WRAPPER_PROPERTIES%") do @(
    @if "%%a"=="distributionUrl" @set "DOWNLOAD_URL=%%b"
  )
)

@set "TEMP_DIR=%TEMP%\mvnw%RANDOM%"
@mkdir "%TEMP_DIR%" 2>NUL

@set "ZIP_FILE=%TEMP_DIR%\maven.zip"

@REM Use PowerShell to download
@powershell -Command "& { [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; Invoke-WebRequest -Uri '%DOWNLOAD_URL%' -OutFile '%ZIP_FILE%' }"
@if %ERRORLEVEL% neq 0 goto error

@set "MAVEN_HOME_PARENT=%MAVEN_HOME%\.."
@if not exist "%MAVEN_HOME_PARENT%" @mkdir "%MAVEN_HOME_PARENT%"

@REM Use PowerShell to extract
@powershell -Command "& { Expand-Archive -Path '%ZIP_FILE%' -DestinationPath '%MAVEN_HOME_PARENT%' -Force }"
@if %ERRORLEVEL% neq 0 goto error

@REM Cleanup
@rd /s /q "%TEMP_DIR%" 2>NUL

:runMaven
@"%MVN_CMD%" %*
@if ERRORLEVEL 1 goto error
@goto end

:error
@set ERROR_CODE=1

:end
@endlocal & set ERROR_CODE=%ERROR_CODE%
@if "%ERROR_CODE%"=="1" @exit /b 1
