require 'json'
require 'pathname'

def use_expo_modules!(custom_options = {})
  # `self` points to Pod::Podfile object
  Autolinking.new(self).useExpoModules!(custom_options)
end

# Implement stuff in the class, so we can make some helpers private and don't expose them outside.
class Autolinking
  def initialize(podfile)
    @podfile = podfile
  end

  def useExpoModules!(options = {})
    searchResults = findModules(options)
    modules = searchResults['modules']
    logs = searchResults['logs']

    if modules.nil?
      return
    end

    flags = options.fetch(:flags, {})
    projectDirectory = Pod::Config.instance.project_root

    modules.each { |expoModule|
      podName = expoModule['podName']
      podPath = expoModule['podspecDir']

      # Install the pod.
      @podfile.pod podName, {
        :path => Pathname.new(podPath).relative_path_from(projectDirectory).to_path
      }.merge(flags)
    }

    # Print any warnings at the end
    if !logs.empty?
      puts logs, ""
    end
  end

  private

  def findModules(options)
    args = convertFindOptionsToArgs(options)
    json = []

    IO.popen(args) do |data|
      while line = data.gets
        json << line
      end
    end

    begin
      JSON.parse(json.join())
    rescue => error
      raise "Couldn't parse JSON coming from `expo-module-autolinking` command:\n#{error}"
    end
  end

  def convertFindOptionsToArgs(options)
    searchPaths = options.fetch(:searchPaths, options.fetch(:modules_paths, nil))
    ignorePaths = options.fetch(:ignorePaths, nil)
    exclude = options.fetch(:exclude, [])

    args = [
      'npx',
      'expo-module-autolinking',
      'resolve',
      '--platform',
      'ios',
      '--json'
    ]

    if !searchPaths.nil?
      args.concat(searchPaths)
    end

    if !ignorePaths.nil?
      args.concat(['--ignore-paths'], ignorePaths)
    end

    if !exclude.nil?
      args.concat(['--exclude'], exclude)
    end

    args
  end
end
