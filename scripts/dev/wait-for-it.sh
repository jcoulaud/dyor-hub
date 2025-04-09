#!/bin/sh

# wait-for-it.sh - Wait for a host:port to be available
# Usage: ./wait-for-it.sh host:port [-t timeout] [-q quiet] [-- command args...]
# Based on the original wait-for-it.sh by vishnubob, simplified for Alpine

WAITFORIT_cmdname=${0##*/}
WAITFORIT_timeout=15
WAITFORIT_quiet=0
WAITFORIT_host=""
WAITFORIT_port=""
WAITFORIT_result=0
WAITFORIT_CLI=""

echoerr() {
  if [ "$WAITFORIT_quiet" -ne 1 ]; then printf "%s\n" "$*" 1>&2; fi
}

usage() {
  cat << USAGE >&2
Usage:
    $WAITFORIT_cmdname host:port [-t timeout] [-q quiet] [-- command args...]
    -q | --quiet      Don't output any status messages
    -t | --timeout    Timeout in seconds (default: 15)
    -- COMMAND ARGS   Execute command with args after the test finishes
USAGE
  exit 1
}

parse_arguments() {
  while [ $# -gt 0 ]
  do
    case "$1" in
      *:* )
        WAITFORIT_host=$(printf "%s\n" "$1"| cut -d : -f 1)
        WAITFORIT_port=$(printf "%s\n" "$1"| cut -d : -f 2)
        shift 1
        ;;
      -q | --quiet)
        WAITFORIT_quiet=1
        shift 1
        ;;
      -t)
        WAITFORIT_timeout="$2"
        if [ -z "$WAITFORIT_timeout" ]; then usage; fi
        shift 2
        ;;
      --)
        shift
        WAITFORIT_CLI="$@"
        break
        ;;
      --help)
        usage
        ;;
      *)
        echoerr "Unknown argument: $1"
        usage
        ;;
    esac
  done

  if [ -z "$WAITFORIT_host" ] || [ -z "$WAITFORIT_port" ]; then
    echoerr "Error: you need to provide a host and port to test."
    usage
  fi
}

wait_for() {
  start_ts=$(date +%s)
  while :
  do
    nc -z "$WAITFORIT_host" "$WAITFORIT_port" > /dev/null 2>&1
    
    result=$?
    if [ $result -eq 0 ]; then
      end_ts=$(date +%s)
      delta=$(echo "$end_ts - $start_ts" | bc)
      echoerr "$WAITFORIT_cmdname: $WAITFORIT_host:$WAITFORIT_port is available after $delta seconds"
      break
    fi
    
    elapsed=$(echo "$(date +%s) - $start_ts" | bc)
    if [ "$elapsed" -gt "$WAITFORIT_timeout" ]; then
      echoerr "$WAITFORIT_cmdname: timeout occurred after waiting $WAITFORIT_timeout seconds for $WAITFORIT_host:$WAITFORIT_port"
      WAITFORIT_result=1
      break
    fi
    
    sleep 1
  done
  return $WAITFORIT_result
}

# Main execution
parse_arguments "$@"

wait_for
WAITFORIT_RESULT=$?

# Execute command if provided
if [ $WAITFORIT_RESULT -eq 0 ] && [ -n "$WAITFORIT_CLI" ]; then
  exec $WAITFORIT_CLI
else
  exit $WAITFORIT_RESULT
fi 